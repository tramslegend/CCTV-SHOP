// Runs in the browser before React hydrates.
//
// Development only: content-blurring browser extensions such as "All blurred" add `gb-*` classes (gb-body,
// gb-blur-svg, gb-blur-image, gb-blur-text, …) to the body, icons, images and text before React hydrates. React then
// reports every touched element as a hydration attribute mismatch and the Next.js dev overlay shows an error that has
// nothing to do with the app. This guard drops a mismatch report only when every difference in it is explained by
// those classes; any other mismatch is reported as usual.
if (process.env.NODE_ENV === "development") {
  const MISMATCH = "didn't match the client properties";
  // "All blurred" also calls classList.add(undefined) for images of 32px or less (including images that haven't
  // loaded yet), which adds a class literally named "undefined".
  const EXTENSION_CLASS_NAMES = ["gb-", "undefined"];
  const isExtensionClass = (token: string) => token.startsWith("gb-") || token === "undefined";
  // A cut-off value may end part-way through one of those names ("g", "gb-b", "undef").
  const isCutExtensionClass = (token: string) => isExtensionClass(token) || EXTENSION_CLASS_NAMES.some((name) => name.startsWith(token));
  const nativeError = console.error.bind(console);
  // Next.js installs its own console.error wrapper (which feeds the dev overlay) after this file runs. Keep this
  // guard outermost: a later assignment to console.error becomes the function the guard forwards to.
  let forward: (...args: unknown[]) => void = nativeError;
  let forwarding = false;
  let noted = false;

  // A className value as React's diff prints it: `className="a b"`, or as JSON, `className={"a [&_p]:b"}`, when it
  // contains characters such as & or '. Either form ends in `..."` when it is cut off at the row width.
  const parseClassName = (text: string) => {
    const match = /^className=(?:"(.*)"|\{(".*")\})$/.exec(text);
    if (!match) return null;
    const [, plain, json] = match;
    if (plain !== undefined) {
      const truncated = plain.endsWith("...");
      return { value: truncated ? plain.slice(0, -3) : plain, truncated };
    }
    const truncated = json.endsWith('..."');
    const body = truncated ? json.slice(0, -4) : json.slice(0, -1);
    // A cut can split an escape sequence (at most 6 characters, a \uXXXX escape); drop the partial escape.
    for (let drop = 0; drop <= (truncated ? 6 : 0); drop++) {
      try {
        return { value: JSON.parse(`${body.slice(0, body.length - drop)}"`) as string, truncated };
      } catch {
        // Try a shorter cut.
      }
    }
    return null;
  };
  const tokens = (value: string) => value.split(/\s+/).filter(Boolean);
  // classList.add (how the extension adds its classes) rewrites the attribute with single spaces and no duplicates.
  const normalise = (value: string) => [...new Set(tokens(value))].join(" ");
  const onlyExtensionClasses = (list: string[], truncated: boolean) =>
    list.every((token, i) => isExtensionClass(token) || (truncated && i === list.length - 1 && isCutExtensionClass(token)));

  // "+ className=<client>" then "- className=<server>": the server value must be the client value with the
  // extension's classes appended.
  const sameApartFromExtension = (clientText: string, serverText: string) => {
    const client = parseClassName(clientText);
    const server = parseClassName(serverText);
    if (!client || !server) return false;
    if (!server.truncated) {
      return !client.truncated && tokens(server.value).filter((t) => !isExtensionClass(t)).join(" ") === normalise(client.value);
    }
    // Both values are cut at the same width, so the visible parts are identical.
    if (client.truncated) return client.value === server.value;
    const base = normalise(client.value);
    // A cut value is shortened by 3 more characters to make room for "...", so it can end inside the client value.
    if (base.startsWith(server.value)) return true;
    const rest = server.value.startsWith(base) ? server.value.slice(base.length) : null;
    return rest !== null && (rest === "" || /^\s/.test(rest)) && onlyExtensionClasses(tokens(rest), true);
  };

  // React's diff marks a client value with "+ " and a server value with "- " at the start of the line; other lines
  // (element tags, unchanged attributes) are indented with spaces.
  const explainedByExtension = (diff: string) => {
    const lines = diff.split("\n").map((raw) => {
      const mark = raw.startsWith("+ ") ? "+" : raw.startsWith("- ") ? "-" : " ";
      return { mark, text: (mark === " " ? raw : raw.slice(2)).trim() };
    });
    let explained = 0;
    let inObject = false;
    for (let i = 0; i < lines.length; i++) {
      const { mark, text } = lines[i];
      if (mark === " ") {
        if (text.endsWith("={{")) inObject = true;
        else if (text === "}}") inObject = false;
        continue;
      }
      // A difference inside a style={{…}} object is never the extension's.
      if (inObject) return false;
      const next = lines[i + 1];
      if (mark === "+" && next?.mark === "-") {
        // A changed attribute (or text).
        if (!sameApartFromExtension(text, next.text)) return false;
        explained++;
        i++;
      } else if (mark === "-") {
        // An attribute only the server HTML has: the extension gave a class to an element that has none of its own.
        const server = parseClassName(text);
        if (!server || !onlyExtensionClasses(tokens(server.value), server.truncated)) return false;
        explained++;
      } else if (text.startsWith("<")) {
        // An element only the client has.
        return false;
      }
      // Any other lone "+" line is the text inside the element above it: React prints an element's text as "+ text"
      // whenever that element has a difference, even though the text itself matched.
    }
    return explained > 0;
  };

  const isExtensionMismatch = (args: unknown[]) => {
    const [message] = args;
    const diff = args.at(-1);
    return (
      typeof message === "string" &&
      message.includes(MISMATCH) &&
      typeof diff === "string" &&
      document.querySelector('[class*="gb-"]') !== null &&
      explainedByExtension(diff)
    );
  };

  const guard = (...args: unknown[]) => {
    // A wrapper installed later may have captured this guard as "the original" and call back into it.
    if (forwarding) return nativeError(...args);
    if (isExtensionMismatch(args)) {
      if (!noted) {
        noted = true;
        console.info("Ignored hydration differences caused by a browser extension that adds gb-* classes.");
      }
      return;
    }
    forwarding = true;
    try {
      forward(...args);
    } finally {
      forwarding = false;
    }
  };

  Object.defineProperty(console, "error", {
    configurable: true,
    get: () => guard,
    set: (fn: (...args: unknown[]) => void) => {
      forward = fn;
    },
  });
}

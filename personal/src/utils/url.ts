function resolveRelative(path: string, base: string) {
  // Commented for reference but not working ok
  // WARN not made by me
  // Absolute URL
  // if (path.match(/^[a-z]*:\/\//)) {
  //   return path;
  // }
  // // Protocol relative URL
  // if (path.indexOf("//") === 0) {
  //   return base.replace(/\/\/.*/, path);
  // }
  // // Upper directory
  // if (path.indexOf("../") === 0) {
  //   return resolveRelative(path.slice(3), base.replace(/\/[^\/]*$/, ""));
  // }
  // // Relative to the root
  // if (path.indexOf("/") === 0) {
  //   var match = base.match(/(\w*:\/\/)?[^\/]*\//) || [base];
  //   return match[0] + path.slice(1);
  // }
  // //relative to the current directory
  // return base.replace(/\/[^\/]*$/, "") + "/" + path.replace(/^\.\//, "");
  return base + path;
}

export const DEURL = {
  resolveRelative,
};

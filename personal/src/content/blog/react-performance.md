---
title: "React performance traps"
description: "List of uncommon or ignored react performance traps and how to avoid them"
pubDate: "September 15 2023"
keywords: "react, performance, typescript, javascript, hooks"
heroImage: "/react.png"
draft: true
---

React is awesome, and yet, react is messy, at least if we are not careful.
This is a list of weird performance traps that I've found while working with react:

## Effects can stop the render

The following snippet causes the app to halt for a few seconds:

```typescript
useEffect(() => {
  const r = /(g|i+)+t/;
  "giiiiiiiiiiiiiiiv".search(r);
}, []);
```

The explanation here in it's simplest form is, useEffect is a syncronous operation,
so if you do something syncronous and heavy inside it, it will stop the render.

Solutions:

- Using a combination of `setTimeout` and splitting the expensive function in chunks, like a generator

- Using web workers, this is a bit tricky, but it's possible to create a function that can be called as a web worker, like this:

```typescript
Function.prototype.callAsWorker = function (...args) {
  return new Promise((resolve, reject) => {
    const code = `self.onmessage = e => self.postMessage((${this.toString()}).call(...e.data));`,
      blob = new Blob([code], { type: "text/javascript" }),
      worker = new Worker(window.URL.createObjectURL(blob));
    worker.onmessage = (e) => (resolve(e.data), worker.terminate());
    worker.onerror = (e) => (reject(e.message), worker.terminate());
    worker.postMessage(args);
  });
};
```

```typescript
myPureAdditionFunction
  .callAsWorker(null, 1, 2)
  .then((sum) => console.log("1+2=" + sum));
```

This is also a huge sledhammer to crack a nut, so it's not recommended unless you are doing something really heavy.

And it's ultimate usage can be boosted by using a custom hook (there are multiple libraries) or tailoring specific functions to work only on web workers.

⚠️ The solution presented is not at all complete and is only for illustration purposes,
for example the worked created in some cases can not postMessage because something cannot be cloned, for example if passing around functions.

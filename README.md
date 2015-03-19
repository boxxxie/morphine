# morphine
living high on simple DI

Heavily inspired by Angular ui.router [$resolve](http://angular-ui.github.io/ui-router/site/#/api/ui.router.util.$resolve)
I wrote this after a stressful day of Shepherd.js and other DI libs making me feel stupid. I am making some micro-services and didn't want to deal with proper DI, I just wanted something like a recursive `Promise.all()`

Ripped some regex magic out of Angular's $inject code, combined with a rewrite of ui.router's $resolve, and you get some sexy Promise dependency injection thing that looks like it was made with sweet.js.

Example:
--------
```javascript

var resolve = require("morphine");

resolve({
  now: function(path){
    return path;
  },
  future: function(path, now){
    return path + now;
  }
},{path: "something"})
.then(console.log);

```
output
```javascript
{ path: 'something',
  now: 'something',
  future: 'somethingsomething' }
```
***
API
---
`resolve(invokables, [knowns]) -> promise`

**invokeables:**

An invokeable is a name (key) and a function with zero or more arguments that map to some or all of the keys in the `invokeables` object (resursive), or the `knowns` object. The return values for the `invokeables` functions can be promises. internally they get converted to promises anyway.

**knowns:**

an object of primative values (strings, ints).

**resolve():**

The return value (promise) that `resolve` gives is an object with the keys from both the `invokeables` and `knowns` list, and the resolved values from all of the `invokeables` (primatives).
***
More Examples:
--------------

```javascript
resolve({
  now: function(path){
    return "something";
  }
})
.then(console.log);
```
output
```javascript
{ path: 'something'}
```
***
```javascript
var fs = require("q-io/fs");
resolve({
  config: function(configPath){
    return fs.read(configPath).then(JSON.parse);
  }
},{configPath: "config.json"})
.then(console.log);
```
output
```javascript
{ configPath: 'config.json',
  config: { obj: { field: [Object] }, server: { port: 1111 } } }
```
***
what happens when you you make typos
```javascript
resolve({
  path: function(){
    return "something";
  },
  fail: function(noResolution, path){
    return noResolution + path;
  }
})
.then(null, _.partial(console.log, "failure case"));
```
output
```
failure case [Error: can not resolve all dependencies: noResolution]
```

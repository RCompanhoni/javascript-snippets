# forever

Tutorial from 'Express in Action' by Evan Hahn. Forever is a module that keeps your apps running forever -- if your app crashes, Forever will try to restart it. Changed the 'start' script to 

```javascript
    "scripts": {
        "start": "forever app.js"
        ...
    },
    ...
```

Execute a GET /crash to simulate a server crash.

### PACKAGES USED

* **forever**: authentication middleware for Node.js

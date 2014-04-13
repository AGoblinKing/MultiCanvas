var Module = (function () { 
    var Module = {
    preRun: [],
    postRun: [],
    print: (function() {
      var element = document.getElementById('output');
      element.value = ''; // clear browser cache
      return function(text) {
        text = Array.prototype.slice.call(arguments).join(' ');
        // These replacements are necessary if you render to raw HTML
        //text = text.replace(/&/g, "&amp;");
        //text = text.replace(/</g, "&lt;");
        //text = text.replace(/>/g, "&gt;");
        //text = text.replace('\n', '<br>', 'g');
        element.value += text + "\n";
        element.scrollTop = element.scrollHeight; // focus on bottom
      };
    })(),
    printErr: function(text) {
      text = Array.prototype.slice.call(arguments).join(' ');
      if (0) { // XXX disabled for safety typeof dump == 'function') {
        dump(text + '\n'); // fast, straight to the real console
      } else {
        console.log(text);
      }
    },
    canvas: document.getElementById('canvas'),
    setStatus: function(text) {
    },
    totalDependencies: 0,
    monitorRunDependencies: function(left) {
      this.totalDependencies = Math.max(this.totalDependencies, left);
      Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies-left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
    }
    };
    
    Module.setStatus('Downloading...');
    return Module;
}());
'use strict';

var Marionette = require('./shims/marionette.js'),
    $ = require('./shims/jquery.js'),
    _ = require('./shims/underscore.js');

var App = new Marionette.Application();

App.addInitializer(function () {
    App.addRegions({
        headerRegions: '#header',
        notificationRegion: '#notification',
        groupContainer: '#groupContainer',
        contentContainer: '#content-container',
        slider: '#slider'
    })
});

App.on('start', function () {
    if (Backbone.history) {
        Backbone.history.start({
            pushState: true,
            root: '/' + $('#discussion-slug').val()
        });

        if (Backbone.history._hasPushState) {
            $(document).delegate("a", "click", function (evt) {
                var href = $(this).attr("href");
                var protocol = this.protocol + "//";
                // Note that we only care about assembl #tags.
                // We should prefix ours. For now, detect annotator.
                if (_.any(this.classList, function(cls) {
                    return cls.indexOf('annotator-') === 0;
                })) return;
                if (typeof href !== 'undefined' && href.slice(protocol.length) !== protocol && /^#.+$/.test(href)) {
                    evt.preventDefault();
                    Backbone.history.navigate(href, true);
                }
            });
        }
    }
});

App.on('start', function(){

    // change dynamically tab title
    document.title = document.querySelector('#discussion-topic').value; // not needed anymore on the debate page

    // change dynamically favicon in tab
    var link = document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = '/static/img/icon/infinite-1.png';
    document.getElementsByTagName('head')[0].appendChild(link);

});

_.extend(Backbone.Marionette.View.prototype, {
  /*
   * Use to check if you should (re)render
   */
  isViewRenderedAndNotYetDestroyed: function() {
    if (this.isRendered === true && this.isDestroyed === false) {
      return true;
    }
    else {
      return false;
    }
  },

  listenTo: function() {
    // Often, we listen on a promise in the initalizer. The view may already be dead.
    if (this.isViewDestroyed()) {
      return;
    }
    Object.getPrototypeOf(Backbone.Marionette.View.prototype).listenTo.apply(this, arguments);
  },

  listenToOnce: function() {
    // Often, we listen on a promise in the initalizer. The view may already be dead.
    if (this.isViewDestroyed()) {
      return;
    }
    Object.getPrototypeOf(Backbone.Marionette.View.prototype).listenToOnce.apply(this, arguments);
  },


  /*
   * Use to check if you should (re)render
   */
  isViewDestroyed: function() {
    return this.isDestroyed;
  },

 /* Use to check if you already rendered at least once
  */
 isViewRendered: function() {
   return this.isRendered;
 },
});

module.exports = App;
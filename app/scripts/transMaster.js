/* global html2canvas, $, _, dat */
'use strict';

var $b = $('body');
var w = window;

function TransController() {
  this.transitions = [];
  this.transitionMaps = [];
}
_.extend(TransController.prototype, {
  registerTransition: function(transition) {
    this.transitions.push(transition);
  },

  _getTransitions: function() {
    return this.transitions;
  },

  registerTransitionMap: function(transitionMap) {
    this.transitionMaps.push(transitionMap);
  },

  _getTransitionMaps: function() {
    return this.transitionMaps;
  }
});

window.TC = new TransController();



var DEFAULTS = {
  transitionType: 'box-transition',
  transitionMapType: 'box-transition-map',
  pages: [
    {
      current: true,
      name: 'first',
      container: '.trans-js-page-1'
    },
    {
      name: 'second',
      container: '.trans-js-page-2'
    }
  ],
  debug: false,
  background: '#FFFFFF',
  pageContainer: 'body',
  renderTimeout: 1 * 1000
};

function TransMaster(options) {
  this._init(_.extend(DEFAULTS, options));
}

_.extend(TransMaster.prototype, {
  _getPage: function(name) {
    return _.find(this._options.pages, function(p) {
      return p.name === name;
    });
  },

  _renderPageToCanvas: function(pageEl, onComplete) {
    var self = this;
    var $page = $(pageEl);

    var $tempCont = $('<div class="trans-temp-container"></div>');
    $tempCont.html($page.clone().get(0));
    $tempCont.css('background', self._options.background);
    $tempCont.children().show();

    $b.append($tempCont);

    html2canvas($tempCont.get(0), {
      logging: self._options.debug,
      width: w.innerWidth,
      height: w.innerHeight,
      onrendered: function(canvas) {
        onComplete.call(self, canvas);
        $tempCont.remove();
      }
    });
  },

  _renderPageElements: function(page) {
    var self = this;
    var pageEl = page.el;
    var $page = $(pageEl);

    var $tempCont = $('<div class="trans-temp-container"></div>');
    $tempCont.html($page.clone().get(0));
    $tempCont.css('background', self._options.background);
    $tempCont.children().show();

    $b.append($tempCont);

    function renderChildren(el) {
      el.children().each(function() {
        var $this = $(this);
        this.myRect = this.getBoundingClientRect();

        function backgroundColor(element) {
          if (element.css('background-color') === 'rgba(0, 0, 0, 0)'){
            return 'transparent';
          }
          return element.css('background-color');
        }

        if(backgroundColor($this) === 'transparent') {
          this.style.backgroundColor = 'inherit';
        }
        html2canvas($this.get(0), {
          onrendered: function(canvas) {
            $this.get(0).myCanvas = canvas;
            $this.get(0).myImg = canvas.toDataURL();
          }
        });
        renderChildren($this);
      });
    }

    renderChildren($tempCont);
    page.domClone = $tempCont;

    //Hackity hack
    setTimeout(function() {
      $tempCont.remove();
    }, 10000);
  },

  _init: function(options) {
    var o = options;

    if (o.debug) {
      this.gui = new dat.GUI();
    }

    this.$pc = $(o.pageContainer);
    this._options = o;
    this._prepareDOM();
    this._generatePages();
    this._initTransitions();

    if (o.debug) {
      this._debugNextPage = 'third';
      this.gui.add(this, '_debugNextPage', _.map(o.pages, function(p) {return p.name; }));
      this.gui.add(this, '_debugGoToNextPage');

      this.gui.add(this, 'openMap');
    }
  },

  //DEBUG FUNCTION!!!
  _debugGoToNextPage: function() {
    this.goToPage(this._debugNextPage);
  },


  _prepareDOM: function() {
    var self = this;
    $b.addClass('trans-body');

    this.$overlay = $('<div class="trans-overlay"></div>');
    this.$overlay.css('background', this._options.background);
    $b.append(this.$overlay);

    _.each(this._options.pages, function(page) {
      page.el = $(page.container);

      if (page.current) {
        self._currentPage = page;
        $(self._currentPage.el).show();
      } else {
        self._removePage(page);
      }
    });
  },

  _initTransitions: function() {
    var self = this;
    this._transitions = {};
    this._transitionMaps = {};
    this._transitionTemp = {};
    this._transitionMapTemp = {};

    _.each(TC._getTransitions(), function(t) {
      self.includeTransition(t);
    });

    _.each(TC._getTransitionMaps(), function(t) {
      self.includeTransitionMap(t);
    });

    if (this._options.debug) {
      this.gui.add(this._options, 'transitionType', _.keys(this._transitions));
      this.gui.add(this._options, 'transitionMapType', _.keys(this._transitionMaps));
    }
  },

  _generatePages: function() {
    var self = this;
    var pages = this._options.pages;
    _.each(pages, function(page) {
      self._renderPageToCanvas(page.el, function(canvas) {
        page.canvas = canvas;
        page.image = canvas.toDataURL('image/jpeg', 1.0);
      });

      self._renderPageElements(page);

      if (self._options.debug) {
        window['pg' + page.name] = page;
      }
    });
  },

  _transition: function(transType, currentPage, nextPage) {
    var self = this;
    var time = Date.now();

    //Set up transition options
    self._transitionTemp = {
      o: self._transitions[transType].options,
      f: self._transitions[transType].gui
    };

    self._transitions[transType].beforeTransition.call(self, currentPage, nextPage, function(status) {
      if (self._options.debug) {
        console.log(status);
        console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
      }
      time = Date.now();
      self._removePage(currentPage);

      self._transitions[transType].doTransition.call(self, currentPage, nextPage, function(status) {
        if (self._options.debug) {
          console.log(status);
          console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
        }
        time = Date.now();

        self._transitions[transType].afterTransition.call(self, currentPage, nextPage, function(status) {
          if (self._options.debug) {
            console.log(status);
            console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
          }

          self._putPage(nextPage);
          self._currentPage = nextPage;
        });
      });
    });
  },

  _transitionMap: function(transMapType, currentPage, pages) {
    var self = this;
    var time = Date.now();

    //Set up transition options
    self._transitionMapTemp = {
      o: self._transitionMaps[transMapType].options,
      f: self._transitionMaps[transMapType].gui
    };

    self._transitionMaps[transMapType].beforeTransitionMap.call(self, currentPage, pages, function(status) {
      if (self._options.debug) {
        console.log(status);
        console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
      }
      time = Date.now();
      self._removePage(currentPage);

      self._transitionMaps[transMapType].doTransitionMap.call(self, currentPage, pages, function(status) {
        if (self._options.debug) {
          console.log(status);
          console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
        }
        time = Date.now();

        self._transitionMaps[transMapType].afterTransitionMap.call(self, currentPage, pages, function(status, nextPage) {
          if (self._options.debug) {
            console.log(status);
            console.log('Elapsed time: ' + ((Date.now() - time) ) + 'ms');
          }

          nextPage = self._getPage(nextPage);
          self._putPage(nextPage);
          self._currentPage = nextPage;
        });
      });
    });
  },

  _removePage: function(page) {
    this.$pc.find(page.container).remove();
  },

  _putPage: function(page) {
    this.$pc.append(page.el);

    $(w).scrollTop(0);
    $(page.el).show();
  },

  chooseTransition: function(transitionName, options) {
    this.o.transitionType = transitionName;

    if (options) {
      this.setTransitionOptions(transitionName, options);
    }
  },

  setTransitionOptions: function(transitionName, options) {
    this._transitions[transitionName].options = _.extend(this._transitions[transitionName].options, options);
  },

  includeTransition: function(transition, options) {
    var transOptions = _.extend(transition.options, options);
    var f;

    if (this._options.debug) {
      var g = this.gui;

      f = g.addFolder(transition.name);

      _.each(transOptions, function(v, k) {
        f.add(transOptions, k);
      });
    }

    this._transitions[transition.name] = {
      options: transOptions,
      gui: f,
      beforeTransition: transition.beforeTransition,
      doTransition: transition.doTransition,
      afterTransition: transition.afterTransition
    };
  },

  includeTransitionMap: function(transitionMap, options) {
    var transOptions = _.extend(transitionMap.options, options);
    var f;

    if (this._options.debug) {
      var g = this.gui;

      f = g.addFolder(transitionMap.name);

      _.each(transOptions, function(v, k) {
        f.add(transOptions, k);
      });
    }

    this._transitionMaps[transitionMap.name] = {
      options: transOptions,
      gui: f,
      beforeTransitionMap: transitionMap.beforeTransitionMap,
      doTransitionMap: transitionMap.doTransitionMap,
      afterTransitionMap: transitionMap.afterTransitionMap
    };
  },

  goToPage: function(pageName) {
    var transType = this._currentPage.transition ? this._currentPage.transition : this._options.transitionType;
    this._transition(transType, this._currentPage, this._getPage(pageName));
  },

  openMap: function() {
    this._transitionMap(this._options.transitionMapType, this._currentPage, this._options.pages);
  }

});

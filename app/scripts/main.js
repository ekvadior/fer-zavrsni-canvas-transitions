/* global $, TransMaster */

'use strict';
var TM = new TransMaster({
  transitionType: 'box-transition',
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
  debug: true,
  background: '#FFFFFF',
  pageContainer: 'body',
});

TM.includeTransition(boxTransition, {
  allowRotationZ: false,
  cameraDistanceMultiplier: 3
});

TM.includeTransition(planeWobbleTransition, {});

$('body').on('click', '.js-change-page', function() {
  var $this = $(this);
  TM.goToPage($this.data('page'));
});

window.tm = TM;

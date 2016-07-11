/*
 *  Copyright (c) 2015 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals AppController, TestCase, UI_CONSTANTS, assertEquals, assertFalse,
   assertTrue, $, RoomSelection:true, Call:true */

'use strict';

describe('AppControllerTest', function() {
  var MockCall;
  var MockRoomSelection;
  var roomSelectionBackup_;
  var callBackup_;
  var loadingParams_;
  var mainElem;

  MockRoomSelection = function() {};
  MockRoomSelection.RecentlyUsedList = function() {
    return {
      pushRecentRoom: function() {}
    };
  };
  MockRoomSelection.matchRandomRoomPattern = function() {
    return false;
  };

  MockCall = function() {};
  MockCall.prototype.start = function() {};
  MockCall.prototype.hangup = function() {};

  beforeEach(function(done) {
    roomSelectionBackup_ = RoomSelection;
    RoomSelection = MockRoomSelection;
    callBackup_ = Call;
    Call = MockCall;
    loadingParams_ = {
      mediaConstraints: {
        audio: true, video: true
      }
    };

    // Insert mock DOM elements.
    mainElem = document.createElement('div');
    document.body.insertBefore(mainElem, document.body.firstChild);
    for (var key in UI_CONSTANTS) {
      var elem = document.createElement('div');
      elem.id = UI_CONSTANTS[key].substr(1);
      mainElem.appendChild(elem);
    }

    loadingParams_.roomId = 'myRoom';
    new AppController(loadingParams_);

    // Needed due to a race where the textContent node is not updated in the div
    //  before testing it.
    $(UI_CONSTANTS.confirmJoinRoomSpan)
        .addEventListener('DOMSubtreeModified',function() {
      done();
    })
  });

  afterEach(function() {
    RoomSelection = roomSelectionBackup_;
    Call = callBackup_;
  });

  it('Confirm to join', function() {
    // Verifies that the confirm-to-join UI is visible and the text matches the
    // room.
    expect($(UI_CONSTANTS.confirmJoinRoomSpan).textContent)
        .toEqual(' "' + loadingParams_.roomId + '"');
    expect($(UI_CONSTANTS.confirmJoinDiv).classList.contains('hidden'))
        .toBeFalsy();
  });

  it('Hide UI after clicking the join button', function() {
    // Verifies that the UI is hidden after clicking the button.
    $(UI_CONSTANTS.confirmJoinButton).click();
    expect($(UI_CONSTANTS.confirmJoinDiv).classList.contains('hidden'))
        .toBeTruthy();
  });

});







// var AppControllerTest = new TestCase('AppControllerTest');

// AppControllerTest.prototype.setUp = function() {
//   this.roomSelectionBackup_ = RoomSelection;
//   RoomSelection = MockRoomSelection;

//   this.callBackup_ = Call;
//   Call = MockCall;

//   // Insert mock DOM elements.
//   for (var key in UI_CONSTANTS) {
//     var elem = document.createElement('div');
//     elem.id = UI_CONSTANTS[key].substr(1);
//     document.body.appendChild(elem);
//   }

//   this.loadingParams_ = {
//     mediaConstraints: {
//       audio: true, video: true
//     }
//   };
// };


// AppControllerTest.prototype.testConfirmToJoin = function() {
//   this.loadingParams_.roomId = 'myRoom';
//   new AppController(this.loadingParams_);

  // Verifies that the confirm-to-join UI is visible and the text matches the
  // room.
//   assertEquals(' "' + this.loadingParams_.roomId + '"',
//                $(UI_CONSTANTS.confirmJoinRoomSpan).textContent);
//   assertFalse($(UI_CONSTANTS.confirmJoinDiv).classList.contains('hidden'));

//   // Verifies that the UI is hidden after clicking the button.
//   $(UI_CONSTANTS.confirmJoinButton).onclick();
//   assertTrue($(UI_CONSTANTS.confirmJoinDiv).classList.contains('hidden'));
// };

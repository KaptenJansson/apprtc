/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */

/* globals TestCase, assertEquals, assertNotNull, assertTrue, assertFalse,
   PeerConnectionClient */

'use strict';

describe('PeerConnectionClient Test', function() {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
  var FAKEPCCONFIG = {
    'bar': 'foo'
  };
  var FAKEPCCONSTRAINTS = {
    'foo': 'bar'
  };

  // var eventArray = function(name) {
  //   this.name = name;
  // };
  // eventArray.prototype = [];
  // eventArray.prototype.push = function() {
  //   console.log('pushing');
  //   for (var i = 0; i < arguments.length; i++) {
  //     Array.prototype.push.call(this, arguments[i]);
  //   }
  //   console.log(this.name);
  //   document.dispatchEvent(this.name + 'ArrayPushed');
  // };

  var peerConnections = [];
  var MockRTCPeerConnection = function(config, constraints) {
    this.config = config;
    this.constraints = constraints;
    this.streams = [];
    this.createSdpRequests = [];
    this.localDescriptions = [];
    this.remoteDescriptions = [];
    this.remoteIceCandidates = [];
    this.signalingState = 'stable';
    this.callback;

    peerConnections.push(this);
  };
  MockRTCPeerConnection.prototype.addStream = function(stream) {
    this.streams.push(stream);
  };
  MockRTCPeerConnection.prototype.createOffer =
      function(constraints) {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.createSdpRequests.push({
        type: 'offer',
        callback: resolve,
        errback: reject,
        constraints: constraints
      });
    });
  };
  MockRTCPeerConnection.prototype.createAnswer =
      function(constraints) {
    var self = this;
    return new Promise(function(resolve, reject) {
      self.createSdpRequests.push({
        type: 'answer',
        callback: resolve,
        errback: reject,
        constraints: constraints
      });
    });
  };
  MockRTCPeerConnection.prototype.resolveLastCreateSdpRequest =
      function(sdp) {
    var request = this.createSdpRequests.pop();
    expect(request).toBeDefined();
    if (sdp) {
      request.callback({
        'type': request.type,
        'sdp': sdp
      })
    } else {
      request.errback(Error('MockCreateSdpError'));
    }
  };
  MockRTCPeerConnection.prototype.setLocalDescription =
      function(localDescription) {
    var self = this;

    if (localDescription.type === 'offer') {
      this.signalingState = 'have-local-offer';
      console.log(this.signalingState);
    } else {
      this.signalingState = 'stable';
      console.log(this.signalingState);
    }
    return new Promise(function(resolve, reject) {
      self.localDescriptions.push({
        description: localDescription,
        callback: resolve,
        errback: reject
      });
      self.onlocaldescription();
    });
  };
  MockRTCPeerConnection.prototype.onlocaldescription = function() {};
  MockRTCPeerConnection.prototype.setemoteDescription =
      function(remoteDescription) {
    var self = this;
    if (remoteDescription.type === 'offer') {
      this.signalingState = 'have-remote-offer';
      console.log(this.signalingState);
    } else {
      console.log(this.signalingState);
      this.signalingState = 'stable';
    }
    return new Promise(function(resolve, reject) {
      self.remoteDescriptions.push({
        description: remoteDescription,
        callback: resolve,
        errback: reject
      });
      self.onremotedescription();
    });
  };
  MockRTCPeerConnection.prototype.onremotedescription = function() {};
  MockRTCPeerConnection.prototype.addIceCandidate = function(candidate) {
    this.remoteIceCandidates.push(candidate);
    return new Promise(function(resolve) {
      resolve();
    });
  };
  MockRTCPeerConnection.prototype.close = function() {
    this.signalingState = 'closed';
  };
  MockRTCPeerConnection.prototype.getRemoteStreams = function() {
    return [{
      getVideoTracks: function() { return ['track']; }
    }];
  };

  function getParams(pcConfig, pcConstraints) {
    return {
      'peerConnectionConfig': pcConfig,
      'peerConnectionConstraints': pcConstraints
    };
  }

  beforeEach(function() {
    window.params = {};

    this.realRTCPeerConnection = window.RTCPeerConnection;
    window.RTCPeerConnection = MockRTCPeerConnection;

    peerConnections.length = 0;
    this.pcClient = new PeerConnectionClient(
        getParams(FAKEPCCONFIG, FAKEPCCONSTRAINTS), window.performance.now());
  });

  afterEach(function() {
    peerConnections = [];
    window.RTCPeerConnection = this.realRTCPeerConnection;
    // this.pcClient.close();
    // this.pcClient = null;
  });

  it('Constructor', function() {
    expect(peerConnections.length).toEqual(1);
    expect(peerConnections[0].config).toEqual(FAKEPCCONFIG);
    expect(peerConnections[0].constraints).toEqual(FAKEPCCONSTRAINTS);
  });

  it('Add stream', function() {
    var stream = {'foo': 'bar'};
    this.pcClient.addStream(stream);
    expect(peerConnections[0].streams.length).toEqual(1);
    expect(peerConnections[0].streams[0]).toEqual(stream);
  });

  it('Start as a caller', function(done) {
    var fakeCandidate = 'fake candidate';
    var pc = peerConnections[0];
    var event = {
      candidate: {
        sdpMLineIndex: 0,
        sdpMid: '1',
        candidate: fakeCandidate
      }
    };
    var expectedMessage = {
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    };
    // Verify the input to setLocalDesciption.
    pc.onlocaldescription = function() {
      expect(pc.localDescriptions.length).toEqual(1);
      expect(pc.localDescriptions[0].description.type).toEqual('offer');
      expect(pc.localDescriptions[0].description.sdp).toEqual(fakeSdp);
    }

    this.pcClient.onsignalingmessage = function(msg) {
      // Verify the output signaling message for the offer.
      if (msg.type === 'offer') {
        expect(msg.sdp).toEqual(fakeSdp);
        // Trigger the candidate event test.
        pc.onicecandidate(event);
      // Verify the output signaling messages for the ICE candidates.
      } else {
        expect(msg.type).toEqual('candidate');
        expect(msg).toEqual(expectedMessage);
        done();
      }
    }

    expect(this.pcClient.startAsCaller(null)).toBeTruthy();

    expect(pc.createSdpRequests.length).toEqual(1);
    var request = pc.createSdpRequests[0];
    expect(request.type).toEqual('offer');

    var fakeSdp = 'fake sdp';
    pc.resolveLastCreateSdpRequest(fakeSdp)
  });

  it('Caller receive signaling message', function(done) {
    var pc = peerConnections[0];
    var self = this;
    var candidate = {
      type: 'candidate',
      label: 0,
      candidate: 'fake candidate'
    };
    var remoteAnswer = {
      type: 'answer',
      sdp: 'fake answer'
    };

    pc.onremotedescription = function() {
      expect(pc.remoteDescriptions.length).toEqual(1);
      expect(pc.remoteDescriptions[0].description.type).toEqual('answer');
      expect(pc.remoteDescriptions[0].description.sdp)
          .toEqual(remoteAnswer.sdp);
      console.log('here')
      // Trigger the remoteIceCandidate test.
      self.pcClient.receiveSignalingMessage(JSON.stringify(candidate));
      done();
    }

    pc.onlocaldescription = function() {
      console.log('here2')
      self.pcClient.receiveSignalingMessage(JSON.stringify(remoteAnswer));
    }

    this.pcClient.onsignalingmessage = function() {
      console.log('signal')
      expect(pc.remoteIceCandidates.length).toEqual(1);
      expect(pc.remoteIceCandidates[0].sdpMLineIndex).toEqual(candidate.label);
      expect(pc.remoteIceCandidates[0].candidate).toEqual(candidate.candidate);
    }

    expect(this.pcClient.startAsCaller(null)).toBeTruthy();
    pc.resolveLastCreateSdpRequest('fake offer');
  });

  // it('Start as callee', function(done) {
  //   var remoteOffer = {
  //     type: 'offer',
  //     sdp: 'fake sdp'
  //   };
  //   var candidate = {
  //     type: 'candidate',
  //     label: 0,
  //     candidate: 'fake candidate'
  //   };
  //   var initialMsgs = [
  //     JSON.stringify(candidate),
  //     JSON.stringify(remoteOffer)
  //   ];
  //   this.pcClient.startAsCallee(initialMsgs);

  //   var pc = peerConnections[0];

  //   var fakeAnswer = 'fake answer';
  //   pc.resolveLastCreateSdpRequest(fakeAnswer, verifyTestResult);

  //   function verifyTestResult() {
  //       // Verify that remote offer and ICE candidates are set.
  //     expect(pc.remoteDescriptions.length).toEqual(1);
  //     expect(pc.remoteDescriptions[0].description.type).toEqual('offer');
  //     expect(pc.remoteDescriptions[0].description.sdp).toEqual(remoteOffer.sdp);
  //     expect(pc.remoteIceCandidates.length).toEqual(1);
  //     expect(pc.remoteIceCandidates[0].sdpMLineIndex).toEqual(candidate.label);
  //     expect(pc.remoteIceCandidates[0].candidate).toEqual(candidate.candidate);

  //     // Verify that createAnswer is called.
  //     console.log('pc.createSdpRequests', pc.createSdpRequests);
  //     expect(pc.createSdpRequests.length).toEqual(1);
  //     expect(pc.createSdpRequests[0].type).toEqual('answer');

  //     // Verify that setLocalDescription is called.
  //     expect(pc.localDescriptions.length).toEqual(1);
  //     expect(pc.localDescriptions[0].description.type).toEqual('answer');
  //     expect(pc.localDescriptions[0].description.sdp).toEqual(fakeAnswer);
  //     console.log('I was here');
  //     done();
  //   }
  // });

  // it('Receive remote offer before started', function() {
  //   var remoteOffer = {
  //     type: 'offer',
  //     sdp: 'fake sdp'
  //   };
  //   this.pcClient.receiveSignalingMessage(JSON.stringify(remoteOffer));
  //   this.pcClient.startAsCallee(null);

  //   // Verify that the offer received before started is processed.
  //   var pc = peerConnections[0];
  //   expect(pc.remoteDescriptions.length).toEqual(1);
  //   expect(pc.remoteDescriptions[0].description.type).toEqual('offer');
  //   expect(pc.remoteDescriptions[0].description.sdp).toEqual(remoteOffer.sdp);
  // });

  // it('Remote hangup', function(done) {
  //   this.pcClient.onremotehangup = done;

  //   this.pcClient.receiveSignalingMessage(JSON.stringify({
  //     type: 'bye'
  //   }));
  // });

  // it('On remote SDP set', function(done) {
  //   this.pcClient.onremotesdpset = function(event) {
  //     console.log(event)
  //     done();
  //   }

  //   var remoteOffer = {
  //     type: 'offer',
  //     sdp: 'fake sdp'
  //   };
  //   var initialMsgs = [JSON.stringify(remoteOffer)];
  //   this.pcClient.startAsCallee(initialMsgs);
  //   console.log(peerConnections[0].remoteDescriptions[0]);
  //   var callback = peerConnections[0].remoteDescriptions[0].callback;
  //   expect(callback).toBeDefined();
  //   console.log(callback);
  //   callback();
  // });

//   it('On remote stream added', function() {
//     var stream = null;
//     function onRemoteStreamAdded(s) {
//       stream = s;
//     }
//     this.pcClient.onremotestreamadded = onRemoteStreamAdded;

//     var event = {
//       stream: 'stream'
//     };
//     peerConnections[0].onaddstream(event);
//     expect(stream).toEqual(event.stream);
//   });

//   it('On signaling state change', function(done) {
//     this.pcClient.onsignalingstatechange = done;
//     peerConnections[0].onsignalingstatechange();
//   });

//   it('On ICE connection state change', function(done) {
//     this.pcClient.oniceconnectionstatechange = done;
//     peerConnections[0].oniceconnectionstatechange();
//   });

//   it('Start as a caller twice failed', function() {
//     expect(this.pcClient.startAsCaller(null)).toBeTruthy();
//     expect(this.pcClient.startAsCaller(null)).toBeFalsy();
//   });

//   it('Close peerConnection', function() {
//     this.pcClient.close();
//     expect(peerConnections[0].signalingState).toEqual('closed');
//   })
});

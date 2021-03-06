(function webpackUniversalModuleDefinition(root, factory) {
  if(typeof exports === 'object' && typeof module === 'object')
    module.exports = factory();
  else if(typeof define === 'function' && define.amd)
    define([], factory);
  else {
    var a = factory();
    for(var i in a) (typeof exports === 'object' ? exports : root)[i] = a[i];
  }
})(this, function() {
return /******/ (function(modules) { // webpackBootstrap
/******/  // The module cache
/******/  var installedModules = {};

/******/  // The require function
/******/  function __webpack_require__(moduleId) {

/******/    // Check if module is in cache
/******/    if(installedModules[moduleId])
/******/      return installedModules[moduleId].exports;

/******/    // Create a new module (and put it into the cache)
/******/    var module = installedModules[moduleId] = {
/******/      exports: {},
/******/      id: moduleId,
/******/      loaded: false
/******/    };

/******/    // Execute the module function
/******/    modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/    // Flag the module as loaded
/******/    module.loaded = true;

/******/    // Return the exports of the module
/******/    return module.exports;
/******/  }


/******/  // expose the modules object (__webpack_modules__)
/******/  __webpack_require__.m = modules;

/******/  // expose the module cache
/******/  __webpack_require__.c = installedModules;

/******/  // __webpack_public_path__
/******/  __webpack_require__.p = "";

/******/  // Load entry module and return exports
/******/  return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var rxjs_1 = __webpack_require__(24);
  var Debug = __webpack_require__(13);
  var PeerActionCreator_1 = __webpack_require__(529);
  var RTCAgent_1 = __webpack_require__(527);
  var SignalingDriver_1 = __webpack_require__(528);
  var Config_1 = __webpack_require__(381);
  var debug = Debug("warp:peer");
  var debugPeer = Debug("warp:PeerJSCompatiAPI");
  /**
   *  Peer class is the interface of RTCPeerConnection and communication with
   *  Signaling server. This is responsible for UserMedia, Signaling and managing
   *  lifetime of many RTCAgent(agent). It is important to be NOT responsible for
   *  generating agent.
   */
  var Peer = (function () {
      function Peer(configuration) {
          var _this = this;
          debug("init peer");
          this.config = new Config_1.Config(configuration);
          this.id = null;
          this.name = null;
          this._signalingServer = new SignalingDriver_1.SignalingDriver(this.config);
          this._agents = {};
          this._action = new PeerActionCreator_1.PeerActionCreator();
          this._dispatcher = this._action.dispatcher;
          this._subscription = new rxjs_1.Subscription();
          this._subscription.add(this._signalingServer.dispatcher.login.subscribe(this._dispatcher.login));
          this._subscription.add(this._signalingServer.dispatcher.login.subscribe(function (info) { _this.info = info; _this.id = info.id; }));
          this._subscription.add(this._signalingServer.dispatcher.updatePeerList.subscribe(this._dispatcher.updatePeerList));
          this._subscription.add(this._signalingServer.dispatcher.ringRequest.subscribe(this._dispatcher.ringRequest));
          this._subscription.add(this._signalingServer.dispatcher.ringResponse.subscribe(this._dispatcher.ringResponse));
          this._subscription.add(this._signalingServer.dispatcher.receiveICECandidate.subscribe(this._dispatcher.receiveICECandidate));
          this._subscription.add(this._signalingServer.dispatcher.connectionError.subscribe(this._dispatcher.signalingServerError));
          this._subscription.add(this._signalingServer.dispatcher.receiveChatMessage.subscribe(this._dispatcher.receiveChatMessage));
          this._subscription.add(this._signalingServer.dispatcher.disconnect.subscribe(function () {
              _this._dispatcher.connectionStateChange.next({ type: "disconnect" });
          }));
          this._subscription.add(this._signalingServer.dispatcher.reconnect.subscribe(function (n) {
              _this._dispatcher.connectionStateChange.next({ type: "reconnect", attepts: n });
          }));
          this._subscription.add(this._signalingServer.dispatcher.connect.subscribe(function () {
              _this._dispatcher.connectionStateChange.next({ type: "connect" });
          }));
          this._subscription.add(this._dispatcher.ringRequest.subscribe(function (req) {
              _this.setOffer(req);
          }));
          this._subscription.add(this._dispatcher.ringResponse.subscribe(function (req) {
              _this.setAnswer(req);
          }));
          this._subscription.add(this._dispatcher.receiveICECandidate.subscribe(function (candidate) {
              _this.setCandidate(candidate);
          }));
          // PeerJS Comaptible API
          this._subscription.add(this._signalingServer.dispatcher.login.subscribe(this._dispatcher.open));
          this._subscription.add(this._signalingServer.dispatcher.ringRequest.subscribe(function (request) {
              var agent = _this.getAgentByRequest(request);
              agent.answer = function (stream) {
                  agent.remote = request.header.sender;
                  agent.stream = stream;
                  agent.setOffer(request.body.sdp);
              };
              _this._dispatcher.call.next(agent);
          }));
          this.addAgent("default");
          this._defaultAgent = this.getAgent("default");
          this._subscription.add(this._defaultAgent.dispatcher.dataChannelMessage.subscribe(function (message) { _this._dispatcher.data.next(message.data); }));
      }
      Peer.prototype.login = function () {
          debug("atempt to login");
          this._signalingServer.login();
      };
      Peer.prototype.send = function (args) {
          this._defaultAgent.dataChannel.send(typeof args === "object" ? JSON.stringify(args) : args);
      };
      Object.defineProperty(Peer.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      Peer.prototype.on = function (eventName, callback) {
          debug(eventName);
          if (this._dispatcher.hasOwnProperty(eventName)) {
              debug("register callback: " + eventName);
              this._subscription.add(this._dispatcher[eventName].subscribe(callback));
          }
          else {
              console.error("event: " + eventName + " does not exist");
          }
      };
      Peer.prototype.dispose = function () {
          this._subscription.unsubscribe();
      };
      Peer.prototype.fetchAgentsList = function () {
      };
      Peer.prototype.sendChatMessage = function (message) {
          this._signalingServer.sendChatMessage(message);
      };
      /**
       * call remote peer by id.
       * @param remoteId remote peer id which you want to call
       * @param agentId specified sender agent id.
       * @return
       */
      Peer.prototype.ring = function (remoteId, agentId) {
          if (agentId === void 0) { agentId = "default"; }
          debug("ring to remoteid: " + remoteId + ", agentId: " + agentId);
          if (!this._agents.hasOwnProperty(agentId)) {
              return undefined;
          }
          var agent = this.getAgent(agentId);
          agent.ring({ id: remoteId, agentId: agentId });
      };
      Peer.prototype.addAgent = function (agentId) {
          var _this = this;
          if (this._agents.hasOwnProperty(agentId)) {
              // XXX Error
              console.error(agentId + " has already registered");
              return;
          }
          var agent = new RTCAgent_1.RTCAgent(this._signalingServer, this.config, agentId);
          agent.dispatcher.close.subscribe(this._dispatcher.close);
          agent.dispatcher.connectionError.subscribe(function (target) {
              if (target.iceConnectionStateChange === "failed") {
                  _this._dispatcher.error.next({
                      type: "iceConnectionFailed",
                      target: target
                  });
              }
          });
          agent.dispatcher.dataChannelOpen.subscribe(function (event) {
              _this._dispatcher.connection.next(agent);
          });
          this._agents[agentId] = agent;
      };
      Peer.prototype.setOffer = function (req) {
          var agent = this.getAgentByRequest(req);
          agent.remote = req.header.sender;
          agent.setOffer(req.body.sdp);
      };
      Peer.prototype.getAgentByRequest = function (req) {
          if (req.header.receiver["agentId"]) {
              return this._agents[req.header.receiver.agentId];
          }
          // XXX throw error
          return null;
      };
      Peer.prototype.getAgent = function (id) {
          if (this._agents.hasOwnProperty(id)) {
              return this._agents[id];
          }
          else {
              return null;
          }
      };
      Peer.prototype.setAnswer = function (req) {
          var agent = this.getAgentByRequest(req);
          agent.remote = req.header.sender;
          agent.setAnswer(req.body.sdp);
      };
      Peer.prototype.setCandidate = function (packet) {
          var agent = this.getAgentByRequest(packet);
          agent.remote = packet.header.sender;
          agent.setRemoteCandidate(packet.body.candidate);
      };
      /**
       * close all connection and remove all subscription of the agent, then remove agent.
       * @param agentId Id of agent that will be removed.
       * @return there is nothing to return.
       */
      Peer.prototype.removeAgent = function (agentId) {
      };
      // PeerJS Comaptible APIs
      Peer.prototype.connect = function (remoteId, agentId) {
          if (agentId === void 0) { agentId = "default"; }
          debugPeer("connect to " + remoteId);
          if (!this._agents.hasOwnProperty(agentId)) {
              return undefined;
          }
          var agent = this.getAgent(agentId);
          agent.ring({ id: remoteId, agentId: agentId });
          return agent;
      };
      Peer.prototype.call = function (remoteId, stream) {
          debugPeer("connect to " + remoteId);
          var agentId = "default";
          if (!this._agents.hasOwnProperty(agentId)) {
              return undefined;
          }
          var agent = this.getAgent(agentId);
          agent.stream = stream;
          agent.ring({ id: remoteId, agentId: agentId });
          return agent;
      };
      return Peer;
  }());
  exports.Adawarp = Peer;
  global["Adawarp"] = Peer;

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var toSubscriber_1 = __webpack_require__(379);
  var observable_1 = __webpack_require__(27);
  /**
   * A representation of any set of values over any amount of time. This the most basic building block
   * of RxJS.
   *
   * @class Observable<T>
   */
  var Observable = (function () {
      /**
       * @constructor
       * @param {Function} subscribe the function that is  called when the Observable is
       * initially subscribed to. This function is given a Subscriber, to which new values
       * can be `next`ed, or an `error` method can be called to raise an error, or
       * `complete` can be called to notify of a successful completion.
       */
      function Observable(subscribe) {
          this._isScalar = false;
          if (subscribe) {
              this._subscribe = subscribe;
          }
      }
      /**
       * Creates a new Observable, with this Observable as the source, and the passed
       * operator defined as the new observable's operator.
       * @method lift
       * @param {Operator} operator the operator defining the operation to take on the observable
       * @return {Observable} a new observable with the Operator applied
       */
      Observable.prototype.lift = function (operator) {
          var observable = new Observable();
          observable.source = this;
          observable.operator = operator;
          return observable;
      };
      Observable.prototype.subscribe = function (observerOrNext, error, complete) {
          var operator = this.operator;
          var sink = toSubscriber_1.toSubscriber(observerOrNext, error, complete);
          if (operator) {
              operator.call(sink, this);
          }
          else {
              sink.add(this._subscribe(sink));
          }
          if (sink.syncErrorThrowable) {
              sink.syncErrorThrowable = false;
              if (sink.syncErrorThrown) {
                  throw sink.syncErrorValue;
              }
          }
          return sink;
      };
      /**
       * @method forEach
       * @param {Function} next a handler for each value emitted by the observable
       * @param {PromiseConstructor} [PromiseCtor] a constructor function used to instantiate the Promise
       * @return {Promise} a promise that either resolves on observable completion or
       *  rejects with the handled error
       */
      Observable.prototype.forEach = function (next, PromiseCtor) {
          var _this = this;
          if (!PromiseCtor) {
              if (root_1.root.Rx && root_1.root.Rx.config && root_1.root.Rx.config.Promise) {
                  PromiseCtor = root_1.root.Rx.config.Promise;
              }
              else if (root_1.root.Promise) {
                  PromiseCtor = root_1.root.Promise;
              }
          }
          if (!PromiseCtor) {
              throw new Error('no Promise impl found');
          }
          return new PromiseCtor(function (resolve, reject) {
              var subscription = _this.subscribe(function (value) {
                  if (subscription) {
                      // if there is a subscription, then we can surmise
                      // the next handling is asynchronous. Any errors thrown
                      // need to be rejected explicitly and unsubscribe must be
                      // called manually
                      try {
                          next(value);
                      }
                      catch (err) {
                          reject(err);
                          subscription.unsubscribe();
                      }
                  }
                  else {
                      // if there is NO subscription, then we're getting a nexted
                      // value synchronously during subscription. We can just call it.
                      // If it errors, Observable's `subscribe` will ensure the
                      // unsubscription logic is called, then synchronously rethrow the error.
                      // After that, Promise will trap the error and send it
                      // down the rejection path.
                      next(value);
                  }
              }, reject, resolve);
          });
      };
      Observable.prototype._subscribe = function (subscriber) {
          return this.source.subscribe(subscriber);
      };
      /**
       * An interop point defined by the es7-observable spec https://github.com/zenparsing/es-observable
       * @method Symbol.observable
       * @return {Observable} this instance of the observable
       */
      Observable.prototype[observable_1.$$observable] = function () {
          return this;
      };
      // HACK: Since TypeScript inherits static properties too, we have to
      // fight against TypeScript here so Subject can have a different static create signature
      /**
       * Creates a new cold Observable by calling the Observable constructor
       * @static true
       * @owner Observable
       * @method create
       * @param {Function} subscribe? the subscriber function to be passed to the Observable constructor
       * @return {Observable} a new cold observable
       */
      Observable.create = function (subscribe) {
          return new Observable(subscribe);
      };
      return Observable;
  }());
  exports.Observable = Observable;
  //# sourceMappingURL=Observable.js.map

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var isFunction_1 = __webpack_require__(44);
  var Subscription_1 = __webpack_require__(6);
  var Observer_1 = __webpack_require__(53);
  var rxSubscriber_1 = __webpack_require__(28);
  /**
   * Implements the {@link Observer} interface and extends the
   * {@link Subscription} class. While the {@link Observer} is the public API for
   * consuming the values of an {@link Observable}, all Observers get converted to
   * a Subscriber, in order to provide Subscription-like capabilities such as
   * `unsubscribe`. Subscriber is a common type in RxJS, and crucial for
   * implementing operators, but it is rarely used as a public API.
   *
   * @class Subscriber<T>
   */
  var Subscriber = (function (_super) {
      __extends(Subscriber, _super);
      /**
       * @param {Observer|function(value: T): void} [destinationOrNext] A partially
       * defined Observer or a `next` callback function.
       * @param {function(e: ?any): void} [error] The `error` callback of an
       * Observer.
       * @param {function(): void} [complete] The `complete` callback of an
       * Observer.
       */
      function Subscriber(destinationOrNext, error, complete) {
          _super.call(this);
          this.syncErrorValue = null;
          this.syncErrorThrown = false;
          this.syncErrorThrowable = false;
          this.isStopped = false;
          switch (arguments.length) {
              case 0:
                  this.destination = Observer_1.empty;
                  break;
              case 1:
                  if (!destinationOrNext) {
                      this.destination = Observer_1.empty;
                      break;
                  }
                  if (typeof destinationOrNext === 'object') {
                      if (destinationOrNext instanceof Subscriber) {
                          this.destination = destinationOrNext;
                          this.destination.add(this);
                      }
                      else {
                          this.syncErrorThrowable = true;
                          this.destination = new SafeSubscriber(this, destinationOrNext);
                      }
                      break;
                  }
              default:
                  this.syncErrorThrowable = true;
                  this.destination = new SafeSubscriber(this, destinationOrNext, error, complete);
                  break;
          }
      }
      Subscriber.prototype[rxSubscriber_1.$$rxSubscriber] = function () { return this; };
      /**
       * A static factory for a Subscriber, given a (potentially partial) definition
       * of an Observer.
       * @param {function(x: ?T): void} [next] The `next` callback of an Observer.
       * @param {function(e: ?any): void} [error] The `error` callback of an
       * Observer.
       * @param {function(): void} [complete] The `complete` callback of an
       * Observer.
       * @return {Subscriber<T>} A Subscriber wrapping the (partially defined)
       * Observer represented by the given arguments.
       */
      Subscriber.create = function (next, error, complete) {
          var subscriber = new Subscriber(next, error, complete);
          subscriber.syncErrorThrowable = false;
          return subscriber;
      };
      /**
       * The {@link Observer} callback to receive notifications of type `next` from
       * the Observable, with a value. The Observable may call this method 0 or more
       * times.
       * @param {T} [value] The `next` value.
       * @return {void}
       */
      Subscriber.prototype.next = function (value) {
          if (!this.isStopped) {
              this._next(value);
          }
      };
      /**
       * The {@link Observer} callback to receive notifications of type `error` from
       * the Observable, with an attached {@link Error}. Notifies the Observer that
       * the Observable has experienced an error condition.
       * @param {any} [err] The `error` exception.
       * @return {void}
       */
      Subscriber.prototype.error = function (err) {
          if (!this.isStopped) {
              this.isStopped = true;
              this._error(err);
          }
      };
      /**
       * The {@link Observer} callback to receive a valueless notification of type
       * `complete` from the Observable. Notifies the Observer that the Observable
       * has finished sending push-based notifications.
       * @return {void}
       */
      Subscriber.prototype.complete = function () {
          if (!this.isStopped) {
              this.isStopped = true;
              this._complete();
          }
      };
      Subscriber.prototype.unsubscribe = function () {
          if (this.closed) {
              return;
          }
          this.isStopped = true;
          _super.prototype.unsubscribe.call(this);
      };
      Subscriber.prototype._next = function (value) {
          this.destination.next(value);
      };
      Subscriber.prototype._error = function (err) {
          this.destination.error(err);
          this.unsubscribe();
      };
      Subscriber.prototype._complete = function () {
          this.destination.complete();
          this.unsubscribe();
      };
      return Subscriber;
  }(Subscription_1.Subscription));
  exports.Subscriber = Subscriber;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SafeSubscriber = (function (_super) {
      __extends(SafeSubscriber, _super);
      function SafeSubscriber(_parent, observerOrNext, error, complete) {
          _super.call(this);
          this._parent = _parent;
          var next;
          var context = this;
          if (isFunction_1.isFunction(observerOrNext)) {
              next = observerOrNext;
          }
          else if (observerOrNext) {
              context = observerOrNext;
              next = observerOrNext.next;
              error = observerOrNext.error;
              complete = observerOrNext.complete;
              if (isFunction_1.isFunction(context.unsubscribe)) {
                  this.add(context.unsubscribe.bind(context));
              }
              context.unsubscribe = this.unsubscribe.bind(this);
          }
          this._context = context;
          this._next = next;
          this._error = error;
          this._complete = complete;
      }
      SafeSubscriber.prototype.next = function (value) {
          if (!this.isStopped && this._next) {
              var _parent = this._parent;
              if (!_parent.syncErrorThrowable) {
                  this.__tryOrUnsub(this._next, value);
              }
              else if (this.__tryOrSetError(_parent, this._next, value)) {
                  this.unsubscribe();
              }
          }
      };
      SafeSubscriber.prototype.error = function (err) {
          if (!this.isStopped) {
              var _parent = this._parent;
              if (this._error) {
                  if (!_parent.syncErrorThrowable) {
                      this.__tryOrUnsub(this._error, err);
                      this.unsubscribe();
                  }
                  else {
                      this.__tryOrSetError(_parent, this._error, err);
                      this.unsubscribe();
                  }
              }
              else if (!_parent.syncErrorThrowable) {
                  this.unsubscribe();
                  throw err;
              }
              else {
                  _parent.syncErrorValue = err;
                  _parent.syncErrorThrown = true;
                  this.unsubscribe();
              }
          }
      };
      SafeSubscriber.prototype.complete = function () {
          if (!this.isStopped) {
              var _parent = this._parent;
              if (this._complete) {
                  if (!_parent.syncErrorThrowable) {
                      this.__tryOrUnsub(this._complete);
                      this.unsubscribe();
                  }
                  else {
                      this.__tryOrSetError(_parent, this._complete);
                      this.unsubscribe();
                  }
              }
              else {
                  this.unsubscribe();
              }
          }
      };
      SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
          try {
              fn.call(this._context, value);
          }
          catch (err) {
              this.unsubscribe();
              throw err;
          }
      };
      SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
          try {
              fn.call(this._context, value);
          }
          catch (err) {
              parent.syncErrorValue = err;
              parent.syncErrorThrown = true;
              return true;
          }
          return false;
      };
      SafeSubscriber.prototype._unsubscribe = function () {
          var _parent = this._parent;
          this._context = null;
          this._parent = null;
          _parent.unsubscribe();
      };
      return SafeSubscriber;
  }(Subscriber));
  //# sourceMappingURL=Subscriber.js.map

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var OuterSubscriber = (function (_super) {
      __extends(OuterSubscriber, _super);
      function OuterSubscriber() {
          _super.apply(this, arguments);
      }
      OuterSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.destination.next(innerValue);
      };
      OuterSubscriber.prototype.notifyError = function (error, innerSub) {
          this.destination.error(error);
      };
      OuterSubscriber.prototype.notifyComplete = function (innerSub) {
          this.destination.complete();
      };
      return OuterSubscriber;
  }(Subscriber_1.Subscriber));
  exports.OuterSubscriber = OuterSubscriber;
  //# sourceMappingURL=OuterSubscriber.js.map

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var isArray_1 = __webpack_require__(11);
  var isPromise_1 = __webpack_require__(77);
  var Observable_1 = __webpack_require__(1);
  var iterator_1 = __webpack_require__(23);
  var InnerSubscriber_1 = __webpack_require__(104);
  var observable_1 = __webpack_require__(27);
  function subscribeToResult(outerSubscriber, result, outerValue, outerIndex) {
      var destination = new InnerSubscriber_1.InnerSubscriber(outerSubscriber, outerValue, outerIndex);
      if (destination.closed) {
          return null;
      }
      if (result instanceof Observable_1.Observable) {
          if (result._isScalar) {
              destination.next(result.value);
              destination.complete();
              return null;
          }
          else {
              return result.subscribe(destination);
          }
      }
      if (isArray_1.isArray(result)) {
          for (var i = 0, len = result.length; i < len && !destination.closed; i++) {
              destination.next(result[i]);
          }
          if (!destination.closed) {
              destination.complete();
          }
      }
      else if (isPromise_1.isPromise(result)) {
          result.then(function (value) {
              if (!destination.closed) {
                  destination.next(value);
                  destination.complete();
              }
          }, function (err) { return destination.error(err); })
              .then(null, function (err) {
              // Escaping the Promise trap: globally throw unhandled errors
              root_1.root.setTimeout(function () { throw err; });
          });
          return destination;
      }
      else if (typeof result[iterator_1.$$iterator] === 'function') {
          var iterator = result[iterator_1.$$iterator]();
          do {
              var item = iterator.next();
              if (item.done) {
                  destination.complete();
                  break;
              }
              destination.next(item.value);
              if (destination.closed) {
                  break;
              }
          } while (true);
      }
      else if (typeof result[observable_1.$$observable] === 'function') {
          var obs = result[observable_1.$$observable]();
          if (typeof obs.subscribe !== 'function') {
              destination.error(new Error('invalid observable'));
          }
          else {
              return obs.subscribe(new InnerSubscriber_1.InnerSubscriber(outerSubscriber, outerValue, outerIndex));
          }
      }
      else {
          destination.error(new TypeError('unknown type returned'));
      }
      return null;
  }
  exports.subscribeToResult = subscribeToResult;
  //# sourceMappingURL=subscribeToResult.js.map

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var Subscriber_1 = __webpack_require__(2);
  var Subscription_1 = __webpack_require__(6);
  var ObjectUnsubscribedError_1 = __webpack_require__(43);
  var SubjectSubscription_1 = __webpack_require__(106);
  var rxSubscriber_1 = __webpack_require__(28);
  /**
   * @class SubjectSubscriber<T>
   */
  var SubjectSubscriber = (function (_super) {
      __extends(SubjectSubscriber, _super);
      function SubjectSubscriber(destination) {
          _super.call(this, destination);
          this.destination = destination;
      }
      return SubjectSubscriber;
  }(Subscriber_1.Subscriber));
  exports.SubjectSubscriber = SubjectSubscriber;
  /**
   * @class Subject<T>
   */
  var Subject = (function (_super) {
      __extends(Subject, _super);
      function Subject() {
          _super.call(this);
          this.observers = [];
          this.closed = false;
          this.isStopped = false;
          this.hasError = false;
          this.thrownError = null;
      }
      Subject.prototype[rxSubscriber_1.$$rxSubscriber] = function () {
          return new SubjectSubscriber(this);
      };
      Subject.prototype.lift = function (operator) {
          var subject = new AnonymousSubject(this, this);
          subject.operator = operator;
          return subject;
      };
      Subject.prototype.next = function (value) {
          if (this.closed) {
              throw new ObjectUnsubscribedError_1.ObjectUnsubscribedError();
          }
          if (!this.isStopped) {
              var observers = this.observers;
              var len = observers.length;
              var copy = observers.slice();
              for (var i = 0; i < len; i++) {
                  copy[i].next(value);
              }
          }
      };
      Subject.prototype.error = function (err) {
          if (this.closed) {
              throw new ObjectUnsubscribedError_1.ObjectUnsubscribedError();
          }
          this.hasError = true;
          this.thrownError = err;
          this.isStopped = true;
          var observers = this.observers;
          var len = observers.length;
          var copy = observers.slice();
          for (var i = 0; i < len; i++) {
              copy[i].error(err);
          }
          this.observers.length = 0;
      };
      Subject.prototype.complete = function () {
          if (this.closed) {
              throw new ObjectUnsubscribedError_1.ObjectUnsubscribedError();
          }
          this.isStopped = true;
          var observers = this.observers;
          var len = observers.length;
          var copy = observers.slice();
          for (var i = 0; i < len; i++) {
              copy[i].complete();
          }
          this.observers.length = 0;
      };
      Subject.prototype.unsubscribe = function () {
          this.isStopped = true;
          this.closed = true;
          this.observers = null;
      };
      Subject.prototype._subscribe = function (subscriber) {
          if (this.closed) {
              throw new ObjectUnsubscribedError_1.ObjectUnsubscribedError();
          }
          else if (this.hasError) {
              subscriber.error(this.thrownError);
              return Subscription_1.Subscription.EMPTY;
          }
          else if (this.isStopped) {
              subscriber.complete();
              return Subscription_1.Subscription.EMPTY;
          }
          else {
              this.observers.push(subscriber);
              return new SubjectSubscription_1.SubjectSubscription(this, subscriber);
          }
      };
      Subject.prototype.asObservable = function () {
          var observable = new Observable_1.Observable();
          observable.source = this;
          return observable;
      };
      Subject.create = function (destination, source) {
          return new AnonymousSubject(destination, source);
      };
      return Subject;
  }(Observable_1.Observable));
  exports.Subject = Subject;
  /**
   * @class AnonymousSubject<T>
   */
  var AnonymousSubject = (function (_super) {
      __extends(AnonymousSubject, _super);
      function AnonymousSubject(destination, source) {
          _super.call(this);
          this.destination = destination;
          this.source = source;
      }
      AnonymousSubject.prototype.next = function (value) {
          var destination = this.destination;
          if (destination && destination.next) {
              destination.next(value);
          }
      };
      AnonymousSubject.prototype.error = function (err) {
          var destination = this.destination;
          if (destination && destination.error) {
              this.destination.error(err);
          }
      };
      AnonymousSubject.prototype.complete = function () {
          var destination = this.destination;
          if (destination && destination.complete) {
              this.destination.complete();
          }
      };
      AnonymousSubject.prototype._subscribe = function (subscriber) {
          var source = this.source;
          if (source) {
              return this.source.subscribe(subscriber);
          }
          else {
              return Subscription_1.Subscription.EMPTY;
          }
      };
      return AnonymousSubject;
  }(Subject));
  exports.AnonymousSubject = AnonymousSubject;
  //# sourceMappingURL=Subject.js.map

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var isArray_1 = __webpack_require__(11);
  var isObject_1 = __webpack_require__(377);
  var isFunction_1 = __webpack_require__(44);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var UnsubscriptionError_1 = __webpack_require__(75);
  /**
   * Represents a disposable resource, such as the execution of an Observable. A
   * Subscription has one important method, `unsubscribe`, that takes no argument
   * and just disposes the resource held by the subscription.
   *
   * Additionally, subscriptions may be grouped together through the `add()`
   * method, which will attach a child Subscription to the current Subscription.
   * When a Subscription is unsubscribed, all its children (and its grandchildren)
   * will be unsubscribed as well.
   *
   * @class Subscription
   */
  var Subscription = (function () {
      /**
       * @param {function(): void} [unsubscribe] A function describing how to
       * perform the disposal of resources when the `unsubscribe` method is called.
       */
      function Subscription(unsubscribe) {
          /**
           * A flag to indicate whether this Subscription has already been unsubscribed.
           * @type {boolean}
           */
          this.closed = false;
          if (unsubscribe) {
              this._unsubscribe = unsubscribe;
          }
      }
      /**
       * Disposes the resources held by the subscription. May, for instance, cancel
       * an ongoing Observable execution or cancel any other type of work that
       * started when the Subscription was created.
       * @return {void}
       */
      Subscription.prototype.unsubscribe = function () {
          var hasErrors = false;
          var errors;
          if (this.closed) {
              return;
          }
          this.closed = true;
          var _a = this, _unsubscribe = _a._unsubscribe, _subscriptions = _a._subscriptions;
          this._subscriptions = null;
          if (isFunction_1.isFunction(_unsubscribe)) {
              var trial = tryCatch_1.tryCatch(_unsubscribe).call(this);
              if (trial === errorObject_1.errorObject) {
                  hasErrors = true;
                  (errors = errors || []).push(errorObject_1.errorObject.e);
              }
          }
          if (isArray_1.isArray(_subscriptions)) {
              var index = -1;
              var len = _subscriptions.length;
              while (++index < len) {
                  var sub = _subscriptions[index];
                  if (isObject_1.isObject(sub)) {
                      var trial = tryCatch_1.tryCatch(sub.unsubscribe).call(sub);
                      if (trial === errorObject_1.errorObject) {
                          hasErrors = true;
                          errors = errors || [];
                          var err = errorObject_1.errorObject.e;
                          if (err instanceof UnsubscriptionError_1.UnsubscriptionError) {
                              errors = errors.concat(err.errors);
                          }
                          else {
                              errors.push(err);
                          }
                      }
                  }
              }
          }
          if (hasErrors) {
              throw new UnsubscriptionError_1.UnsubscriptionError(errors);
          }
      };
      /**
       * Adds a tear down to be called during the unsubscribe() of this
       * Subscription.
       *
       * If the tear down being added is a subscription that is already
       * unsubscribed, is the same reference `add` is being called on, or is
       * `Subscription.EMPTY`, it will not be added.
       *
       * If this subscription is already in an `closed` state, the passed
       * tear down logic will be executed immediately.
       *
       * @param {TeardownLogic} teardown The additional logic to execute on
       * teardown.
       * @return {Subscription} Returns the Subscription used or created to be
       * added to the inner subscriptions list. This Subscription can be used with
       * `remove()` to remove the passed teardown logic from the inner subscriptions
       * list.
       */
      Subscription.prototype.add = function (teardown) {
          if (!teardown || (teardown === Subscription.EMPTY)) {
              return Subscription.EMPTY;
          }
          if (teardown === this) {
              return this;
          }
          var sub = teardown;
          switch (typeof teardown) {
              case 'function':
                  sub = new Subscription(teardown);
              case 'object':
                  if (sub.closed || typeof sub.unsubscribe !== 'function') {
                      break;
                  }
                  else if (this.closed) {
                      sub.unsubscribe();
                  }
                  else {
                      (this._subscriptions || (this._subscriptions = [])).push(sub);
                  }
                  break;
              default:
                  throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
          }
          return sub;
      };
      /**
       * Removes a Subscription from the internal list of subscriptions that will
       * unsubscribe during the unsubscribe process of this Subscription.
       * @param {Subscription} subscription The subscription to remove.
       * @return {void}
       */
      Subscription.prototype.remove = function (subscription) {
          // HACK: This might be redundant because of the logic in `add()`
          if (subscription == null || (subscription === this) || (subscription === Subscription.EMPTY)) {
              return;
          }
          var subscriptions = this._subscriptions;
          if (subscriptions) {
              var subscriptionIndex = subscriptions.indexOf(subscription);
              if (subscriptionIndex !== -1) {
                  subscriptions.splice(subscriptionIndex, 1);
              }
          }
      };
      Subscription.EMPTY = (function (empty) {
          empty.closed = true;
          return empty;
      }(new Subscription()));
      return Subscription;
  }());
  exports.Subscription = Subscription;
  //# sourceMappingURL=Subscription.js.map

/***/ },
/* 7 */
/***/ function(module, exports) {

  "use strict";
  // typeof any so that it we don't have to cast when comparing a result to the error object
  exports.errorObject = { e: {} };
  //# sourceMappingURL=errorObject.js.map

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var errorObject_1 = __webpack_require__(7);
  var tryCatchTarget;
  function tryCatcher() {
      try {
          return tryCatchTarget.apply(this, arguments);
      }
      catch (e) {
          errorObject_1.errorObject.e = e;
          return errorObject_1.errorObject;
      }
  }
  function tryCatch(fn) {
      tryCatchTarget = fn;
      return tryCatcher;
  }
  exports.tryCatch = tryCatch;
  ;
  //# sourceMappingURL=tryCatch.js.map

/***/ },
/* 9 */
/***/ function(module, exports) {

  /* WEBPACK VAR INJECTION */(function(global) {"use strict";
  /**
   * window: browser in DOM main thread
   * self: browser in WebWorker
   * global: Node.js/other
   */
  exports.root = (typeof window == 'object' && window.window === window && window
      || typeof self == 'object' && self.self === self && self
      || typeof global == 'object' && global.global === global && global);
  if (!exports.root) {
      throw new Error('RxJS could not find any global context (window, self, global)');
  }
  //# sourceMappingURL=root.js.map
  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var AsyncAction_1 = __webpack_require__(21);
  var AsyncScheduler_1 = __webpack_require__(22);
  exports.async = new AsyncScheduler_1.AsyncScheduler(AsyncAction_1.AsyncAction);
  //# sourceMappingURL=async.js.map

/***/ },
/* 11 */
/***/ function(module, exports) {

  "use strict";
  exports.isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });
  //# sourceMappingURL=isArray.js.map

/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var ScalarObservable_1 = __webpack_require__(36);
  var EmptyObservable_1 = __webpack_require__(14);
  var isScheduler_1 = __webpack_require__(15);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var ArrayObservable = (function (_super) {
      __extends(ArrayObservable, _super);
      function ArrayObservable(array, scheduler) {
          _super.call(this);
          this.array = array;
          this.scheduler = scheduler;
          if (!scheduler && array.length === 1) {
              this._isScalar = true;
              this.value = array[0];
          }
      }
      ArrayObservable.create = function (array, scheduler) {
          return new ArrayObservable(array, scheduler);
      };
      /**
       * Creates an Observable that emits some values you specify as arguments,
       * immediately one after the other, and then emits a complete notification.
       *
       * <span class="informal">Emits the arguments you provide, then completes.
       * </span>
       *
       * <img src="./img/of.png" width="100%">
       *
       * This static operator is useful for creating a simple Observable that only
       * emits the arguments given, and the complete notification thereafter. It can
       * be used for composing with other Observables, such as with {@link concat}.
       * By default, it uses a `null` Scheduler, which means the `next`
       * notifications are sent synchronously, although with a different Scheduler
       * it is possible to determine when those notifications will be delivered.
       *
       * @example <caption>Emit 10, 20, 30, then 'a', 'b', 'c', then start ticking every second.</caption>
       * var numbers = Rx.Observable.of(10, 20, 30);
       * var letters = Rx.Observable.of('a', 'b', 'c');
       * var interval = Rx.Observable.interval(1000);
       * var result = numbers.concat(letters).concat(interval);
       * result.subscribe(x => console.log(x));
       *
       * @see {@link create}
       * @see {@link empty}
       * @see {@link never}
       * @see {@link throw}
       *
       * @param {...T} values Arguments that represent `next` values to be emitted.
       * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
       * the emissions of the `next` notifications.
       * @return {Observable<T>} An Observable that emits each given input value.
       * @static true
       * @name of
       * @owner Observable
       */
      ArrayObservable.of = function () {
          var array = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              array[_i - 0] = arguments[_i];
          }
          var scheduler = array[array.length - 1];
          if (isScheduler_1.isScheduler(scheduler)) {
              array.pop();
          }
          else {
              scheduler = null;
          }
          var len = array.length;
          if (len > 1) {
              return new ArrayObservable(array, scheduler);
          }
          else if (len === 1) {
              return new ScalarObservable_1.ScalarObservable(array[0], scheduler);
          }
          else {
              return new EmptyObservable_1.EmptyObservable(scheduler);
          }
      };
      ArrayObservable.dispatch = function (state) {
          var array = state.array, index = state.index, count = state.count, subscriber = state.subscriber;
          if (index >= count) {
              subscriber.complete();
              return;
          }
          subscriber.next(array[index]);
          if (subscriber.closed) {
              return;
          }
          state.index = index + 1;
          this.schedule(state);
      };
      ArrayObservable.prototype._subscribe = function (subscriber) {
          var index = 0;
          var array = this.array;
          var count = array.length;
          var scheduler = this.scheduler;
          if (scheduler) {
              return scheduler.schedule(ArrayObservable.dispatch, 0, {
                  array: array, index: index, count: count, subscriber: subscriber
              });
          }
          else {
              for (var i = 0; i < count && !subscriber.closed; i++) {
                  subscriber.next(array[i]);
              }
              subscriber.complete();
          }
      };
      return ArrayObservable;
  }(Observable_1.Observable));
  exports.ArrayObservable = ArrayObservable;
  //# sourceMappingURL=ArrayObservable.js.map

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

  
  /**
   * This is the web browser implementation of `debug()`.
   *
   * Expose `debug()` as the module.
   */

  exports = module.exports = __webpack_require__(95);
  exports.log = log;
  exports.formatArgs = formatArgs;
  exports.save = save;
  exports.load = load;
  exports.useColors = useColors;
  exports.storage = 'undefined' != typeof chrome
                 && 'undefined' != typeof chrome.storage
                    ? chrome.storage.local
                    : localstorage();

  /**
   * Colors.
   */

  exports.colors = [
    'lightseagreen',
    'forestgreen',
    'goldenrod',
    'dodgerblue',
    'darkorchid',
    'crimson'
  ];

  /**
   * Currently only WebKit-based Web Inspectors, Firefox >= v31,
   * and the Firebug extension (any Firefox version) are known
   * to support "%c" CSS customizations.
   *
   * TODO: add a `localStorage` variable to explicitly enable/disable colors
   */

  function useColors() {
    // is webkit? http://stackoverflow.com/a/16459606/376773
    return ('WebkitAppearance' in document.documentElement.style) ||
      // is firebug? http://stackoverflow.com/a/398120/376773
      (window.console && (console.firebug || (console.exception && console.table))) ||
      // is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
  }

  /**
   * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
   */

  exports.formatters.j = function(v) {
    return JSON.stringify(v);
  };


  /**
   * Colorize log arguments if enabled.
   *
   * @api public
   */

  function formatArgs() {
    var args = arguments;
    var useColors = this.useColors;

    args[0] = (useColors ? '%c' : '')
      + this.namespace
      + (useColors ? ' %c' : ' ')
      + args[0]
      + (useColors ? '%c ' : ' ')
      + '+' + exports.humanize(this.diff);

    if (!useColors) return args;

    var c = 'color: ' + this.color;
    args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

    // the final "%c" is somewhat tricky, because there could be other
    // arguments passed either before or after the %c, so we need to
    // figure out the correct index to insert the CSS into
    var index = 0;
    var lastC = 0;
    args[0].replace(/%[a-z%]/g, function(match) {
      if ('%%' === match) return;
      index++;
      if ('%c' === match) {
        // we only are interested in the *last* %c
        // (the user may have provided their own)
        lastC = index;
      }
    });

    args.splice(lastC, 0, c);
    return args;
  }

  /**
   * Invokes `console.log()` when available.
   * No-op when `console.log` is not a "function".
   *
   * @api public
   */

  function log() {
    // this hackery is required for IE8/9, where
    // the `console.log` function doesn't have 'apply'
    return 'object' === typeof console
      && console.log
      && Function.prototype.apply.call(console.log, console, arguments);
  }

  /**
   * Save `namespaces`.
   *
   * @param {String} namespaces
   * @api private
   */

  function save(namespaces) {
    try {
      if (null == namespaces) {
        exports.storage.removeItem('debug');
      } else {
        exports.storage.debug = namespaces;
      }
    } catch(e) {}
  }

  /**
   * Load `namespaces`.
   *
   * @return {String} returns the previously persisted debug modes
   * @api private
   */

  function load() {
    var r;
    try {
      r = exports.storage.debug;
    } catch(e) {}
    return r;
  }

  /**
   * Enable namespaces listed in `localStorage.debug` initially.
   */

  exports.enable(load());

  /**
   * Localstorage attempts to return the localstorage.
   *
   * This is necessary because safari throws
   * when a user disables cookies/localstorage
   * and you attempt to access it.
   *
   * @return {LocalStorage}
   * @api private
   */

  function localstorage(){
    try {
      return window.localStorage;
    } catch (e) {}
  }


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var EmptyObservable = (function (_super) {
      __extends(EmptyObservable, _super);
      function EmptyObservable(scheduler) {
          _super.call(this);
          this.scheduler = scheduler;
      }
      /**
       * Creates an Observable that emits no items to the Observer and immediately
       * emits a complete notification.
       *
       * <span class="informal">Just emits 'complete', and nothing else.
       * </span>
       *
       * <img src="./img/empty.png" width="100%">
       *
       * This static operator is useful for creating a simple Observable that only
       * emits the complete notification. It can be used for composing with other
       * Observables, such as in a {@link mergeMap}.
       *
       * @example <caption>Emit the number 7, then complete.</caption>
       * var result = Rx.Observable.empty().startWith(7);
       * result.subscribe(x => console.log(x));
       *
       * @example <caption>Map and flatten only odd numbers to the sequence 'a', 'b', 'c'</caption>
       * var interval = Rx.Observable.interval(1000);
       * var result = interval.mergeMap(x =>
       *   x % 2 === 1 ? Rx.Observable.of('a', 'b', 'c') : Rx.Observable.empty()
       * );
       * result.subscribe(x => console.log(x));
       *
       * @see {@link create}
       * @see {@link never}
       * @see {@link of}
       * @see {@link throw}
       *
       * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
       * the emission of the complete notification.
       * @return {Observable} An "empty" Observable: emits only the complete
       * notification.
       * @static true
       * @name empty
       * @owner Observable
       */
      EmptyObservable.create = function (scheduler) {
          return new EmptyObservable(scheduler);
      };
      EmptyObservable.dispatch = function (arg) {
          var subscriber = arg.subscriber;
          subscriber.complete();
      };
      EmptyObservable.prototype._subscribe = function (subscriber) {
          var scheduler = this.scheduler;
          if (scheduler) {
              return scheduler.schedule(EmptyObservable.dispatch, 0, { subscriber: subscriber });
          }
          else {
              subscriber.complete();
          }
      };
      return EmptyObservable;
  }(Observable_1.Observable));
  exports.EmptyObservable = EmptyObservable;
  //# sourceMappingURL=EmptyObservable.js.map

/***/ },
/* 15 */
/***/ function(module, exports) {

  "use strict";
  function isScheduler(value) {
      return value && typeof value.schedule === 'function';
  }
  exports.isScheduler = isScheduler;
  //# sourceMappingURL=isScheduler.js.map

/***/ },
/* 16 */,
/* 17 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ConnectableObservable_1 = __webpack_require__(54);
  /* tslint:disable:max-line-length */
  function multicast(subjectOrSubjectFactory, selector) {
      var subjectFactory;
      if (typeof subjectOrSubjectFactory === 'function') {
          subjectFactory = subjectOrSubjectFactory;
      }
      else {
          subjectFactory = function subjectFactory() {
              return subjectOrSubjectFactory;
          };
      }
      if (typeof selector === 'function') {
          return this.lift(new MulticastOperator(subjectFactory, selector));
      }
      var connectable = Object.create(this, ConnectableObservable_1.connectableObservableDescriptor);
      connectable.source = this;
      connectable.subjectFactory = subjectFactory;
      return connectable;
  }
  exports.multicast = multicast;
  var MulticastOperator = (function () {
      function MulticastOperator(subjectFactory, selector) {
          this.subjectFactory = subjectFactory;
          this.selector = selector;
      }
      MulticastOperator.prototype.call = function (subscriber, self) {
          var selector = this.selector;
          var connectable = new ConnectableObservable_1.ConnectableObservable(self.source, this.subjectFactory);
          var subscription = selector(connectable).subscribe(subscriber);
          subscription.add(connectable.connect());
          return subscription;
      };
      return MulticastOperator;
  }());
  exports.MulticastOperator = MulticastOperator;
  //# sourceMappingURL=multicast.js.map

/***/ },
/* 18 */,
/* 19 */,
/* 20 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  /**
   * Represents a push-based event or value that an {@link Observable} can emit.
   * This class is particularly useful for operators that manage notifications,
   * like {@link materialize}, {@link dematerialize}, {@link observeOn}, and
   * others. Besides wrapping the actual delivered value, it also annotates it
   * with metadata of, for instance, what type of push message it is (`next`,
   * `error`, or `complete`).
   *
   * @see {@link materialize}
   * @see {@link dematerialize}
   * @see {@link observeOn}
   *
   * @class Notification<T>
   */
  var Notification = (function () {
      function Notification(kind, value, exception) {
          this.kind = kind;
          this.value = value;
          this.exception = exception;
          this.hasValue = kind === 'N';
      }
      /**
       * Delivers to the given `observer` the value wrapped by this Notification.
       * @param {Observer} observer
       * @return
       */
      Notification.prototype.observe = function (observer) {
          switch (this.kind) {
              case 'N':
                  return observer.next && observer.next(this.value);
              case 'E':
                  return observer.error && observer.error(this.exception);
              case 'C':
                  return observer.complete && observer.complete();
          }
      };
      /**
       * Given some {@link Observer} callbacks, deliver the value represented by the
       * current Notification to the correctly corresponding callback.
       * @param {function(value: T): void} next An Observer `next` callback.
       * @param {function(err: any): void} [error] An Observer `error` callback.
       * @param {function(): void} [complete] An Observer `complete` callback.
       * @return {any}
       */
      Notification.prototype.do = function (next, error, complete) {
          var kind = this.kind;
          switch (kind) {
              case 'N':
                  return next && next(this.value);
              case 'E':
                  return error && error(this.exception);
              case 'C':
                  return complete && complete();
          }
      };
      /**
       * Takes an Observer or its individual callback functions, and calls `observe`
       * or `do` methods accordingly.
       * @param {Observer|function(value: T): void} nextOrObserver An Observer or
       * the `next` callback.
       * @param {function(err: any): void} [error] An Observer `error` callback.
       * @param {function(): void} [complete] An Observer `complete` callback.
       * @return {any}
       */
      Notification.prototype.accept = function (nextOrObserver, error, complete) {
          if (nextOrObserver && typeof nextOrObserver.next === 'function') {
              return this.observe(nextOrObserver);
          }
          else {
              return this.do(nextOrObserver, error, complete);
          }
      };
      /**
       * Returns a simple Observable that just delivers the notification represented
       * by this Notification instance.
       * @return {any}
       */
      Notification.prototype.toObservable = function () {
          var kind = this.kind;
          switch (kind) {
              case 'N':
                  return Observable_1.Observable.of(this.value);
              case 'E':
                  return Observable_1.Observable.throw(this.exception);
              case 'C':
                  return Observable_1.Observable.empty();
          }
          throw new Error('unexpected notification kind value');
      };
      /**
       * A shortcut to create a Notification instance of the type `next` from a
       * given value.
       * @param {T} value The `next` value.
       * @return {Notification<T>} The "next" Notification representing the
       * argument.
       */
      Notification.createNext = function (value) {
          if (typeof value !== 'undefined') {
              return new Notification('N', value);
          }
          return this.undefinedValueNotification;
      };
      /**
       * A shortcut to create a Notification instance of the type `error` from a
       * given error.
       * @param {any} [err] The `error` exception.
       * @return {Notification<T>} The "error" Notification representing the
       * argument.
       */
      Notification.createError = function (err) {
          return new Notification('E', undefined, err);
      };
      /**
       * A shortcut to create a Notification instance of the type `complete`.
       * @return {Notification<any>} The valueless "complete" Notification.
       */
      Notification.createComplete = function () {
          return this.completeNotification;
      };
      Notification.completeNotification = new Notification('C');
      Notification.undefinedValueNotification = new Notification('N', undefined);
      return Notification;
  }());
  exports.Notification = Notification;
  //# sourceMappingURL=Notification.js.map

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var root_1 = __webpack_require__(9);
  var Action_1 = __webpack_require__(360);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var AsyncAction = (function (_super) {
      __extends(AsyncAction, _super);
      function AsyncAction(scheduler, work) {
          _super.call(this, scheduler, work);
          this.scheduler = scheduler;
          this.work = work;
          this.pending = false;
      }
      AsyncAction.prototype.schedule = function (state, delay) {
          if (delay === void 0) { delay = 0; }
          if (this.closed) {
              return this;
          }
          // Always replace the current state with the new state.
          this.state = state;
          // Set the pending flag indicating that this action has been scheduled, or
          // has recursively rescheduled itself.
          this.pending = true;
          var id = this.id;
          var scheduler = this.scheduler;
          //
          // Important implementation note:
          //
          // Actions only execute once by default, unless rescheduled from within the
          // scheduled callback. This allows us to implement single and repeat
          // actions via the same code path, without adding API surface area, as well
          // as mimic traditional recursion but across asynchronous boundaries.
          //
          // However, JS runtimes and timers distinguish between intervals achieved by
          // serial `setTimeout` calls vs. a single `setInterval` call. An interval of
          // serial `setTimeout` calls can be individually delayed, which delays
          // scheduling the next `setTimeout`, and so on. `setInterval` attempts to
          // guarantee the interval callback will be invoked more precisely to the
          // interval period, regardless of load.
          //
          // Therefore, we use `setInterval` to schedule single and repeat actions.
          // If the action reschedules itself with the same delay, the interval is not
          // canceled. If the action doesn't reschedule, or reschedules with a
          // different delay, the interval will be canceled after scheduled callback
          // execution.
          //
          if (id != null) {
              this.id = this.recycleAsyncId(scheduler, id, delay);
          }
          this.delay = delay;
          // If this action has already an async Id, don't request a new one.
          this.id = this.id || this.requestAsyncId(scheduler, this.id, delay);
          return this;
      };
      AsyncAction.prototype.requestAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          return root_1.root.setInterval(scheduler.flush.bind(scheduler, this), delay);
      };
      AsyncAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          // If this action is rescheduled with the same delay time, don't clear the interval id.
          if (delay !== null && this.delay === delay) {
              return id;
          }
          // Otherwise, if the action's delay time is different from the current delay,
          // clear the interval id
          return root_1.root.clearInterval(id) && undefined || undefined;
      };
      /**
       * Immediately executes this action and the `work` it contains.
       * @return {any}
       */
      AsyncAction.prototype.execute = function (state, delay) {
          if (this.closed) {
              return new Error('executing a cancelled action');
          }
          this.pending = false;
          var error = this._execute(state, delay);
          if (error) {
              return error;
          }
          else if (this.pending === false && this.id != null) {
              // Dequeue if the action didn't reschedule itself. Don't call
              // unsubscribe(), because the action could reschedule later.
              // For example:
              // ```
              // scheduler.schedule(function doWork(counter) {
              //   /* ... I'm a busy worker bee ... */
              //   var originalAction = this;
              //   /* wait 100ms before rescheduling the action */
              //   setTimeout(function () {
              //     originalAction.schedule(counter + 1);
              //   }, 100);
              // }, 1000);
              // ```
              this.id = this.recycleAsyncId(this.scheduler, this.id, null);
          }
      };
      AsyncAction.prototype._execute = function (state, delay) {
          var errored = false;
          var errorValue = undefined;
          try {
              this.work(state);
          }
          catch (e) {
              errored = true;
              errorValue = !!e && e || new Error(e);
          }
          if (errored) {
              this.unsubscribe();
              return errorValue;
          }
      };
      AsyncAction.prototype._unsubscribe = function () {
          var id = this.id;
          var scheduler = this.scheduler;
          var actions = scheduler.actions;
          var index = actions.indexOf(this);
          this.work = null;
          this.delay = null;
          this.state = null;
          this.pending = false;
          this.scheduler = null;
          if (index !== -1) {
              actions.splice(index, 1);
          }
          if (id != null) {
              this.id = this.recycleAsyncId(scheduler, id, null);
          }
      };
      return AsyncAction;
  }(Action_1.Action));
  exports.AsyncAction = AsyncAction;
  //# sourceMappingURL=AsyncAction.js.map

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Scheduler_1 = __webpack_require__(105);
  var AsyncScheduler = (function (_super) {
      __extends(AsyncScheduler, _super);
      function AsyncScheduler() {
          _super.apply(this, arguments);
          this.actions = [];
          /**
           * A flag to indicate whether the Scheduler is currently executing a batch of
           * queued actions.
           * @type {boolean}
           */
          this.active = false;
          /**
           * An internal ID used to track the latest asynchronous task such as those
           * coming from `setTimeout`, `setInterval`, `requestAnimationFrame`, and
           * others.
           * @type {any}
           */
          this.scheduled = undefined;
      }
      AsyncScheduler.prototype.flush = function (action) {
          var actions = this.actions;
          if (this.active) {
              actions.push(action);
              return;
          }
          var error;
          this.active = true;
          do {
              if (error = action.execute(action.state, action.delay)) {
                  break;
              }
          } while (action = actions.shift()); // exhaust the scheduler queue
          this.active = false;
          if (error) {
              while (action = actions.shift()) {
                  action.unsubscribe();
              }
              throw error;
          }
      };
      return AsyncScheduler;
  }(Scheduler_1.Scheduler));
  exports.AsyncScheduler = AsyncScheduler;
  //# sourceMappingURL=AsyncScheduler.js.map

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var Symbol = root_1.root.Symbol;
  if (typeof Symbol === 'function') {
      if (Symbol.iterator) {
          exports.$$iterator = Symbol.iterator;
      }
      else if (typeof Symbol.for === 'function') {
          exports.$$iterator = Symbol.for('iterator');
      }
  }
  else {
      if (root_1.root.Set && typeof new root_1.root.Set()['@@iterator'] === 'function') {
          // Bug for mozilla version
          exports.$$iterator = '@@iterator';
      }
      else if (root_1.root.Map) {
          // es6-shim specific logic
          var keys = Object.getOwnPropertyNames(root_1.root.Map.prototype);
          for (var i = 0; i < keys.length; ++i) {
              var key = keys[i];
              if (key !== 'entries' && key !== 'size' && root_1.root.Map.prototype[key] === root_1.root.Map.prototype['entries']) {
                  exports.$$iterator = key;
                  break;
              }
          }
      }
      else {
          exports.$$iterator = '@@iterator';
      }
  }
  //# sourceMappingURL=iterator.js.map

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  /* tslint:disable:no-unused-variable */
  // Subject imported before Observable to bypass circular dependency issue since
  // Subject extends Observable and Observable references Subject in it's
  // definition
  var Subject_1 = __webpack_require__(5);
  exports.Subject = Subject_1.Subject;
  exports.AnonymousSubject = Subject_1.AnonymousSubject;
  /* tslint:enable:no-unused-variable */
  var Observable_1 = __webpack_require__(1);
  exports.Observable = Observable_1.Observable;
  // statics
  /* tslint:disable:no-use-before-declare */
  __webpack_require__(107);
  __webpack_require__(108);
  __webpack_require__(109);
  __webpack_require__(110);
  __webpack_require__(111);
  __webpack_require__(114);
  __webpack_require__(115);
  __webpack_require__(116);
  __webpack_require__(117);
  __webpack_require__(118);
  __webpack_require__(119);
  __webpack_require__(120);
  __webpack_require__(121);
  __webpack_require__(122);
  __webpack_require__(123);
  __webpack_require__(128);
  __webpack_require__(124);
  __webpack_require__(125);
  __webpack_require__(126);
  __webpack_require__(127);
  __webpack_require__(129);
  __webpack_require__(132);
  __webpack_require__(130);
  __webpack_require__(131);
  __webpack_require__(133);
  //dom
  __webpack_require__(112);
  __webpack_require__(113);
  //operators
  __webpack_require__(136);
  __webpack_require__(137);
  __webpack_require__(138);
  __webpack_require__(139);
  __webpack_require__(140);
  __webpack_require__(141);
  __webpack_require__(142);
  __webpack_require__(143);
  __webpack_require__(144);
  __webpack_require__(145);
  __webpack_require__(146);
  __webpack_require__(147);
  __webpack_require__(148);
  __webpack_require__(154);
  __webpack_require__(149);
  __webpack_require__(150);
  __webpack_require__(151);
  __webpack_require__(152);
  __webpack_require__(153);
  __webpack_require__(155);
  __webpack_require__(156);
  __webpack_require__(157);
  __webpack_require__(158);
  __webpack_require__(159);
  __webpack_require__(162);
  __webpack_require__(163);
  __webpack_require__(164);
  __webpack_require__(160);
  __webpack_require__(165);
  __webpack_require__(166);
  __webpack_require__(167);
  __webpack_require__(168);
  __webpack_require__(169);
  __webpack_require__(170);
  __webpack_require__(171);
  __webpack_require__(172);
  __webpack_require__(134);
  __webpack_require__(135);
  __webpack_require__(173);
  __webpack_require__(174);
  __webpack_require__(161);
  __webpack_require__(175);
  __webpack_require__(176);
  __webpack_require__(177);
  __webpack_require__(178);
  __webpack_require__(179);
  __webpack_require__(180);
  __webpack_require__(181);
  __webpack_require__(182);
  __webpack_require__(183);
  __webpack_require__(184);
  __webpack_require__(185);
  __webpack_require__(186);
  __webpack_require__(187);
  __webpack_require__(188);
  __webpack_require__(189);
  __webpack_require__(190);
  __webpack_require__(191);
  __webpack_require__(192);
  __webpack_require__(194);
  __webpack_require__(193);
  __webpack_require__(195);
  __webpack_require__(196);
  __webpack_require__(197);
  __webpack_require__(198);
  __webpack_require__(199);
  __webpack_require__(200);
  __webpack_require__(201);
  __webpack_require__(202);
  __webpack_require__(203);
  __webpack_require__(204);
  __webpack_require__(205);
  __webpack_require__(206);
  __webpack_require__(207);
  __webpack_require__(208);
  __webpack_require__(209);
  __webpack_require__(210);
  __webpack_require__(211);
  __webpack_require__(212);
  __webpack_require__(213);
  __webpack_require__(214);
  __webpack_require__(215);
  __webpack_require__(216);
  __webpack_require__(217);
  __webpack_require__(218);
  __webpack_require__(219);
  __webpack_require__(220);
  __webpack_require__(221);
  __webpack_require__(222);
  __webpack_require__(223);
  __webpack_require__(224);
  __webpack_require__(225);
  __webpack_require__(226);
  __webpack_require__(227);
  __webpack_require__(228);
  __webpack_require__(229);
  __webpack_require__(230);
  __webpack_require__(231);
  __webpack_require__(232);
  __webpack_require__(233);
  __webpack_require__(234);
  /* tslint:disable:no-unused-variable */
  var Subscription_1 = __webpack_require__(6);
  exports.Subscription = Subscription_1.Subscription;
  var Subscriber_1 = __webpack_require__(2);
  exports.Subscriber = Subscriber_1.Subscriber;
  var AsyncSubject_1 = __webpack_require__(25);
  exports.AsyncSubject = AsyncSubject_1.AsyncSubject;
  var ReplaySubject_1 = __webpack_require__(35);
  exports.ReplaySubject = ReplaySubject_1.ReplaySubject;
  var BehaviorSubject_1 = __webpack_require__(52);
  exports.BehaviorSubject = BehaviorSubject_1.BehaviorSubject;
  var ConnectableObservable_1 = __webpack_require__(54);
  exports.ConnectableObservable = ConnectableObservable_1.ConnectableObservable;
  var Notification_1 = __webpack_require__(20);
  exports.Notification = Notification_1.Notification;
  var EmptyError_1 = __webpack_require__(30);
  exports.EmptyError = EmptyError_1.EmptyError;
  var ArgumentOutOfRangeError_1 = __webpack_require__(29);
  exports.ArgumentOutOfRangeError = ArgumentOutOfRangeError_1.ArgumentOutOfRangeError;
  var ObjectUnsubscribedError_1 = __webpack_require__(43);
  exports.ObjectUnsubscribedError = ObjectUnsubscribedError_1.ObjectUnsubscribedError;
  var TimeoutError_1 = __webpack_require__(74);
  exports.TimeoutError = TimeoutError_1.TimeoutError;
  var UnsubscriptionError_1 = __webpack_require__(75);
  exports.UnsubscriptionError = UnsubscriptionError_1.UnsubscriptionError;
  var timeInterval_1 = __webpack_require__(67);
  exports.TimeInterval = timeInterval_1.TimeInterval;
  var timestamp_1 = __webpack_require__(68);
  exports.Timestamp = timestamp_1.Timestamp;
  var TestScheduler_1 = __webpack_require__(370);
  exports.TestScheduler = TestScheduler_1.TestScheduler;
  var VirtualTimeScheduler_1 = __webpack_require__(69);
  exports.VirtualTimeScheduler = VirtualTimeScheduler_1.VirtualTimeScheduler;
  var AjaxObservable_1 = __webpack_require__(57);
  exports.AjaxResponse = AjaxObservable_1.AjaxResponse;
  exports.AjaxError = AjaxObservable_1.AjaxError;
  exports.AjaxTimeoutError = AjaxObservable_1.AjaxTimeoutError;
  var asap_1 = __webpack_require__(70);
  var async_1 = __webpack_require__(10);
  var queue_1 = __webpack_require__(71);
  var animationFrame_1 = __webpack_require__(367);
  var rxSubscriber_1 = __webpack_require__(28);
  var iterator_1 = __webpack_require__(23);
  var observable_1 = __webpack_require__(27);
  /* tslint:enable:no-unused-variable */
  /**
   * @typedef {Object} Rx.Scheduler
   * @property {Scheduler} queue Schedules on a queue in the current event frame
   * (trampoline scheduler). Use this for iteration operations.
   * @property {Scheduler} asap Schedules on the micro task queue, which uses the
   * fastest transport mechanism available, either Node.js' `process.nextTick()`
   * or Web Worker MessageChannel or setTimeout or others. Use this for
   * asynchronous conversions.
   * @property {Scheduler} async Schedules work with `setInterval`. Use this for
   * time-based operations.
   * @property {Scheduler} animationFrame Schedules work with `requestAnimationFrame`.
   * Use this for synchronizing with the platform's painting
   */
  var Scheduler = {
      asap: asap_1.asap,
      queue: queue_1.queue,
      animationFrame: animationFrame_1.animationFrame,
      async: async_1.async
  };
  exports.Scheduler = Scheduler;
  /**
   * @typedef {Object} Rx.Symbol
   * @property {Symbol|string} rxSubscriber A symbol to use as a property name to
   * retrieve an "Rx safe" Observer from an object. "Rx safety" can be defined as
   * an object that has all of the traits of an Rx Subscriber, including the
   * ability to add and remove subscriptions to the subscription chain and
   * guarantees involving event triggering (can't "next" after unsubscription,
   * etc).
   * @property {Symbol|string} observable A symbol to use as a property name to
   * retrieve an Observable as defined by the [ECMAScript "Observable" spec](https://github.com/zenparsing/es-observable).
   * @property {Symbol|string} iterator The ES6 symbol to use as a property name
   * to retrieve an iterator from an object.
   */
  var Symbol = {
      rxSubscriber: rxSubscriber_1.$$rxSubscriber,
      observable: observable_1.$$observable,
      iterator: iterator_1.$$iterator
  };
  exports.Symbol = Symbol;
  //# sourceMappingURL=Rx.js.map

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var Subscription_1 = __webpack_require__(6);
  /**
   * @class AsyncSubject<T>
   */
  var AsyncSubject = (function (_super) {
      __extends(AsyncSubject, _super);
      function AsyncSubject() {
          _super.apply(this, arguments);
          this.value = null;
          this.hasNext = false;
          this.hasCompleted = false;
      }
      AsyncSubject.prototype._subscribe = function (subscriber) {
          if (this.hasCompleted && this.hasNext) {
              subscriber.next(this.value);
              subscriber.complete();
              return Subscription_1.Subscription.EMPTY;
          }
          else if (this.hasError) {
              subscriber.error(this.thrownError);
              return Subscription_1.Subscription.EMPTY;
          }
          return _super.prototype._subscribe.call(this, subscriber);
      };
      AsyncSubject.prototype.next = function (value) {
          if (!this.hasCompleted) {
              this.value = value;
              this.hasNext = true;
          }
      };
      AsyncSubject.prototype.complete = function () {
          this.hasCompleted = true;
          if (this.hasNext) {
              _super.prototype.next.call(this, this.value);
          }
          _super.prototype.complete.call(this);
      };
      return AsyncSubject;
  }(Subject_1.Subject));
  exports.AsyncSubject = AsyncSubject;
  //# sourceMappingURL=AsyncSubject.js.map

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Converts a higher-order Observable into a first-order Observable which
   * concurrently delivers all values that are emitted on the inner Observables.
   *
   * <span class="informal">Flattens an Observable-of-Observables.</span>
   *
   * <img src="./img/mergeAll.png" width="100%">
   *
   * `mergeAll` subscribes to an Observable that emits Observables, also known as
   * a higher-order Observable. Each time it observes one of these emitted inner
   * Observables, it subscribes to that and delivers all the values from the
   * inner Observable on the output Observable. The output Observable only
   * completes once all inner Observables have completed. Any error delivered by
   * a inner Observable will be immediately emitted on the output Observable.
   *
   * @example <caption>Spawn a new interval Observable for each click event, and blend their outputs as one Observable</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
   * var firstOrder = higherOrder.mergeAll();
   * firstOrder.subscribe(x => console.log(x));
   *
   * @example <caption>Count from 0 to 9 every second for each click, but only allow 2 concurrent timers</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000).take(10));
   * var firstOrder = higherOrder.mergeAll(2);
   * firstOrder.subscribe(x => console.log(x));
   *
   * @see {@link combineAll}
   * @see {@link concatAll}
   * @see {@link exhaust}
   * @see {@link merge}
   * @see {@link mergeMap}
   * @see {@link mergeMapTo}
   * @see {@link mergeScan}
   * @see {@link switch}
   * @see {@link zipAll}
   *
   * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of inner
   * Observables being subscribed to concurrently.
   * @return {Observable} An Observable that emits values coming from all the
   * inner Observables emitted by the source Observable.
   * @method mergeAll
   * @owner Observable
   */
  function mergeAll(concurrent) {
      if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
      return this.lift(new MergeAllOperator(concurrent));
  }
  exports.mergeAll = mergeAll;
  var MergeAllOperator = (function () {
      function MergeAllOperator(concurrent) {
          this.concurrent = concurrent;
      }
      MergeAllOperator.prototype.call = function (observer, source) {
          return source._subscribe(new MergeAllSubscriber(observer, this.concurrent));
      };
      return MergeAllOperator;
  }());
  exports.MergeAllOperator = MergeAllOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MergeAllSubscriber = (function (_super) {
      __extends(MergeAllSubscriber, _super);
      function MergeAllSubscriber(destination, concurrent) {
          _super.call(this, destination);
          this.concurrent = concurrent;
          this.hasCompleted = false;
          this.buffer = [];
          this.active = 0;
      }
      MergeAllSubscriber.prototype._next = function (observable) {
          if (this.active < this.concurrent) {
              this.active++;
              this.add(subscribeToResult_1.subscribeToResult(this, observable));
          }
          else {
              this.buffer.push(observable);
          }
      };
      MergeAllSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (this.active === 0 && this.buffer.length === 0) {
              this.destination.complete();
          }
      };
      MergeAllSubscriber.prototype.notifyComplete = function (innerSub) {
          var buffer = this.buffer;
          this.remove(innerSub);
          this.active--;
          if (buffer.length > 0) {
              this._next(buffer.shift());
          }
          else if (this.active === 0 && this.hasCompleted) {
              this.destination.complete();
          }
      };
      return MergeAllSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.MergeAllSubscriber = MergeAllSubscriber;
  //# sourceMappingURL=mergeAll.js.map

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  function getSymbolObservable(context) {
      var $$observable;
      var Symbol = context.Symbol;
      if (typeof Symbol === 'function') {
          if (Symbol.observable) {
              $$observable = Symbol.observable;
          }
          else {
              $$observable = Symbol('observable');
              Symbol.observable = $$observable;
          }
      }
      else {
          $$observable = '@@observable';
      }
      return $$observable;
  }
  exports.getSymbolObservable = getSymbolObservable;
  exports.$$observable = getSymbolObservable(root_1.root);
  //# sourceMappingURL=observable.js.map

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var Symbol = root_1.root.Symbol;
  exports.$$rxSubscriber = (typeof Symbol === 'function' && typeof Symbol.for === 'function') ?
      Symbol.for('rxSubscriber') : '@@rxSubscriber';
  //# sourceMappingURL=rxSubscriber.js.map

/***/ },
/* 29 */
/***/ function(module, exports) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  /**
   * An error thrown when an element was queried at a certain index of an
   * Observable, but no such index or position exists in that sequence.
   *
   * @see {@link elementAt}
   * @see {@link take}
   * @see {@link takeLast}
   *
   * @class ArgumentOutOfRangeError
   */
  var ArgumentOutOfRangeError = (function (_super) {
      __extends(ArgumentOutOfRangeError, _super);
      function ArgumentOutOfRangeError() {
          var err = _super.call(this, 'argument out of range');
          this.name = err.name = 'ArgumentOutOfRangeError';
          this.stack = err.stack;
          this.message = err.message;
      }
      return ArgumentOutOfRangeError;
  }(Error));
  exports.ArgumentOutOfRangeError = ArgumentOutOfRangeError;
  //# sourceMappingURL=ArgumentOutOfRangeError.js.map

/***/ },
/* 30 */
/***/ function(module, exports) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  /**
   * An error thrown when an Observable or a sequence was queried but has no
   * elements.
   *
   * @see {@link first}
   * @see {@link last}
   * @see {@link single}
   *
   * @class EmptyError
   */
  var EmptyError = (function (_super) {
      __extends(EmptyError, _super);
      function EmptyError() {
          var err = _super.call(this, 'no elements in sequence');
          this.name = err.name = 'EmptyError';
          this.stack = err.stack;
          this.message = err.message;
      }
      return EmptyError;
  }(Error));
  exports.EmptyError = EmptyError;
  //# sourceMappingURL=EmptyError.js.map

/***/ },
/* 31 */
/***/ function(module, exports) {

  "use strict";
  function isDate(value) {
      return value instanceof Date && !isNaN(+value);
  }
  exports.isDate = isDate;
  //# sourceMappingURL=isDate.js.map

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(87).nextTick;
  var apply = Function.prototype.apply;
  var slice = Array.prototype.slice;
  var immediateIds = {};
  var nextImmediateId = 0;

  // DOM APIs, for completeness

  exports.setTimeout = function() {
    return new Timeout(apply.call(setTimeout, window, arguments), clearTimeout);
  };
  exports.setInterval = function() {
    return new Timeout(apply.call(setInterval, window, arguments), clearInterval);
  };
  exports.clearTimeout =
  exports.clearInterval = function(timeout) { timeout.close(); };

  function Timeout(id, clearFn) {
    this._id = id;
    this._clearFn = clearFn;
  }
  Timeout.prototype.unref = Timeout.prototype.ref = function() {};
  Timeout.prototype.close = function() {
    this._clearFn.call(window, this._id);
  };

  // Does not start the time, just sets up the members needed.
  exports.enroll = function(item, msecs) {
    clearTimeout(item._idleTimeoutId);
    item._idleTimeout = msecs;
  };

  exports.unenroll = function(item) {
    clearTimeout(item._idleTimeoutId);
    item._idleTimeout = -1;
  };

  exports._unrefActive = exports.active = function(item) {
    clearTimeout(item._idleTimeoutId);

    var msecs = item._idleTimeout;
    if (msecs >= 0) {
      item._idleTimeoutId = setTimeout(function onTimeout() {
        if (item._onTimeout)
          item._onTimeout();
      }, msecs);
    }
  };

  // That's not how node.js implements it but the exposed api is the same.
  exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
    var id = nextImmediateId++;
    var args = arguments.length < 2 ? false : slice.call(arguments, 1);

    immediateIds[id] = true;

    nextTick(function onNextTick() {
      if (immediateIds[id]) {
        // fn.call() is faster so we optimize for the common use-case
        // @see http://jsperf.com/call-apply-segu
        if (args) {
          fn.apply(null, args);
        } else {
          fn.call(null);
        }
        // Prevent ids from leaking
        exports.clearImmediate(id);
      }
    });

    return id;
  };

  exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
    delete immediateIds[id];
  };
  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(32).setImmediate, __webpack_require__(32).clearImmediate))

/***/ },
/* 33 */,
/* 34 */,
/* 35 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var queue_1 = __webpack_require__(71);
  var observeOn_1 = __webpack_require__(40);
  /**
   * @class ReplaySubject<T>
   */
  var ReplaySubject = (function (_super) {
      __extends(ReplaySubject, _super);
      function ReplaySubject(bufferSize, windowTime, scheduler) {
          if (bufferSize === void 0) { bufferSize = Number.POSITIVE_INFINITY; }
          if (windowTime === void 0) { windowTime = Number.POSITIVE_INFINITY; }
          _super.call(this);
          this.scheduler = scheduler;
          this._events = [];
          this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
          this._windowTime = windowTime < 1 ? 1 : windowTime;
      }
      ReplaySubject.prototype.next = function (value) {
          var now = this._getNow();
          this._events.push(new ReplayEvent(now, value));
          this._trimBufferThenGetEvents();
          _super.prototype.next.call(this, value);
      };
      ReplaySubject.prototype._subscribe = function (subscriber) {
          var _events = this._trimBufferThenGetEvents();
          var scheduler = this.scheduler;
          if (scheduler) {
              subscriber.add(subscriber = new observeOn_1.ObserveOnSubscriber(subscriber, scheduler));
          }
          var len = _events.length;
          for (var i = 0; i < len && !subscriber.closed; i++) {
              subscriber.next(_events[i].value);
          }
          return _super.prototype._subscribe.call(this, subscriber);
      };
      ReplaySubject.prototype._getNow = function () {
          return (this.scheduler || queue_1.queue).now();
      };
      ReplaySubject.prototype._trimBufferThenGetEvents = function () {
          var now = this._getNow();
          var _bufferSize = this._bufferSize;
          var _windowTime = this._windowTime;
          var _events = this._events;
          var eventsCount = _events.length;
          var spliceCount = 0;
          // Trim events that fall out of the time window.
          // Start at the front of the list. Break early once
          // we encounter an event that falls within the window.
          while (spliceCount < eventsCount) {
              if ((now - _events[spliceCount].time) < _windowTime) {
                  break;
              }
              spliceCount++;
          }
          if (eventsCount > _bufferSize) {
              spliceCount = Math.max(spliceCount, eventsCount - _bufferSize);
          }
          if (spliceCount > 0) {
              _events.splice(0, spliceCount);
          }
          return _events;
      };
      return ReplaySubject;
  }(Subject_1.Subject));
  exports.ReplaySubject = ReplaySubject;
  var ReplayEvent = (function () {
      function ReplayEvent(time, value) {
          this.time = time;
          this.value = value;
      }
      return ReplayEvent;
  }());
  //# sourceMappingURL=ReplaySubject.js.map

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var ScalarObservable = (function (_super) {
      __extends(ScalarObservable, _super);
      function ScalarObservable(value, scheduler) {
          _super.call(this);
          this.value = value;
          this.scheduler = scheduler;
          this._isScalar = true;
          if (scheduler) {
              this._isScalar = false;
          }
      }
      ScalarObservable.create = function (value, scheduler) {
          return new ScalarObservable(value, scheduler);
      };
      ScalarObservable.dispatch = function (state) {
          var done = state.done, value = state.value, subscriber = state.subscriber;
          if (done) {
              subscriber.complete();
              return;
          }
          subscriber.next(value);
          if (subscriber.closed) {
              return;
          }
          state.done = true;
          this.schedule(state);
      };
      ScalarObservable.prototype._subscribe = function (subscriber) {
          var value = this.value;
          var scheduler = this.scheduler;
          if (scheduler) {
              return scheduler.schedule(ScalarObservable.dispatch, 0, {
                  done: false, value: value, subscriber: subscriber
              });
          }
          else {
              subscriber.next(value);
              if (!subscriber.closed) {
                  subscriber.complete();
              }
          }
      };
      return ScalarObservable;
  }(Observable_1.Observable));
  exports.ScalarObservable = ScalarObservable;
  //# sourceMappingURL=ScalarObservable.js.map

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var ArrayObservable_1 = __webpack_require__(12);
  var isArray_1 = __webpack_require__(11);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  var none = {};
  /* tslint:disable:max-line-length */
  function combineLatest() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      var project = null;
      if (typeof observables[observables.length - 1] === 'function') {
          project = observables.pop();
      }
      // if the first and only other argument besides the resultSelector is an array
      // assume it's been called with `combineLatest([obs1, obs2, obs3], project)`
      if (observables.length === 1 && isArray_1.isArray(observables[0])) {
          observables = observables[0];
      }
      observables.unshift(this);
      return this.lift.call(new ArrayObservable_1.ArrayObservable(observables), new CombineLatestOperator(project));
  }
  exports.combineLatest = combineLatest;
  var CombineLatestOperator = (function () {
      function CombineLatestOperator(project) {
          this.project = project;
      }
      CombineLatestOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new CombineLatestSubscriber(subscriber, this.project));
      };
      return CombineLatestOperator;
  }());
  exports.CombineLatestOperator = CombineLatestOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var CombineLatestSubscriber = (function (_super) {
      __extends(CombineLatestSubscriber, _super);
      function CombineLatestSubscriber(destination, project) {
          _super.call(this, destination);
          this.project = project;
          this.active = 0;
          this.values = [];
          this.observables = [];
      }
      CombineLatestSubscriber.prototype._next = function (observable) {
          this.values.push(none);
          this.observables.push(observable);
      };
      CombineLatestSubscriber.prototype._complete = function () {
          var observables = this.observables;
          var len = observables.length;
          if (len === 0) {
              this.destination.complete();
          }
          else {
              this.active = len;
              this.toRespond = len;
              for (var i = 0; i < len; i++) {
                  var observable = observables[i];
                  this.add(subscribeToResult_1.subscribeToResult(this, observable, observable, i));
              }
          }
      };
      CombineLatestSubscriber.prototype.notifyComplete = function (unused) {
          if ((this.active -= 1) === 0) {
              this.destination.complete();
          }
      };
      CombineLatestSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var values = this.values;
          var oldVal = values[outerIndex];
          var toRespond = !this.toRespond
              ? 0
              : oldVal === none ? --this.toRespond : this.toRespond;
          values[outerIndex] = innerValue;
          if (toRespond === 0) {
              if (this.project) {
                  this._tryProject(values);
              }
              else {
                  this.destination.next(values.slice());
              }
          }
      };
      CombineLatestSubscriber.prototype._tryProject = function (values) {
          var result;
          try {
              result = this.project.apply(this, values);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.destination.next(result);
      };
      return CombineLatestSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.CombineLatestSubscriber = CombineLatestSubscriber;
  //# sourceMappingURL=combineLatest.js.map

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var isScheduler_1 = __webpack_require__(15);
  var ArrayObservable_1 = __webpack_require__(12);
  var mergeAll_1 = __webpack_require__(26);
  /* tslint:disable:max-line-length */
  function concat() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      return this.lift.call(concatStatic.apply(void 0, [this].concat(observables)));
  }
  exports.concat = concat;
  /* tslint:enable:max-line-length */
  /**
   * Creates an output Observable which sequentially emits all values from every
   * given input Observable after the current Observable.
   *
   * <span class="informal">Concatenates multiple Observables together by
   * sequentially emitting their values, one Observable after the other.</span>
   *
   * <img src="./img/concat.png" width="100%">
   *
   * Joins multiple Observables together by subscribing to them one at a time and
   * merging their results into the output Observable. Will wait for each
   * Observable to complete before moving on to the next.
   *
   * @example <caption>Concatenate a timer counting from 0 to 3 with a synchronous sequence from 1 to 10</caption>
   * var timer = Rx.Observable.interval(1000).take(4);
   * var sequence = Rx.Observable.range(1, 10);
   * var result = Rx.Observable.concat(timer, sequence);
   * result.subscribe(x => console.log(x));
   *
   * @example <caption>Concatenate 3 Observables</caption>
   * var timer1 = Rx.Observable.interval(1000).take(10);
   * var timer2 = Rx.Observable.interval(2000).take(6);
   * var timer3 = Rx.Observable.interval(500).take(10);
   * var result = Rx.Observable.concat(timer1, timer2, timer3);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link concatAll}
   * @see {@link concatMap}
   * @see {@link concatMapTo}
   *
   * @param {Observable} input1 An input Observable to concatenate with others.
   * @param {Observable} input2 An input Observable to concatenate with others.
   * More than one input Observables may be given as argument.
   * @param {Scheduler} [scheduler=null] An optional Scheduler to schedule each
   * Observable subscription on.
   * @return {Observable} All values of each passed Observable merged into a
   * single Observable, in order, in serial fashion.
   * @static true
   * @name concat
   * @owner Observable
   */
  function concatStatic() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      var scheduler = null;
      var args = observables;
      if (isScheduler_1.isScheduler(args[observables.length - 1])) {
          scheduler = args.pop();
      }
      if (scheduler === null && observables.length === 1) {
          return observables[0];
      }
      return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new mergeAll_1.MergeAllOperator(1));
  }
  exports.concatStatic = concatStatic;
  //# sourceMappingURL=concat.js.map

/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Applies a given `project` function to each value emitted by the source
   * Observable, and emits the resulting values as an Observable.
   *
   * <span class="informal">Like [Array.prototype.map()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map),
   * it passes each source value through a transformation function to get
   * corresponding output values.</span>
   *
   * <img src="./img/map.png" width="100%">
   *
   * Similar to the well known `Array.prototype.map` function, this operator
   * applies a projection to each value and emits that projection in the output
   * Observable.
   *
   * @example <caption>Map every every click to the clientX position of that click</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var positions = clicks.map(ev => ev.clientX);
   * positions.subscribe(x => console.log(x));
   *
   * @see {@link mapTo}
   * @see {@link pluck}
   *
   * @param {function(value: T, index: number): R} project The function to apply
   * to each `value` emitted by the source Observable. The `index` parameter is
   * the number `i` for the i-th emission that has happened since the
   * subscription, starting from the number `0`.
   * @param {any} [thisArg] An optional argument to define what `this` is in the
   * `project` function.
   * @return {Observable<R>} An Observable that emits the values from the source
   * Observable transformed by the given `project` function.
   * @method map
   * @owner Observable
   */
  function map(project, thisArg) {
      if (typeof project !== 'function') {
          throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
      }
      return this.lift(new MapOperator(project, thisArg));
  }
  exports.map = map;
  var MapOperator = (function () {
      function MapOperator(project, thisArg) {
          this.project = project;
          this.thisArg = thisArg;
      }
      MapOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
      };
      return MapOperator;
  }());
  exports.MapOperator = MapOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MapSubscriber = (function (_super) {
      __extends(MapSubscriber, _super);
      function MapSubscriber(destination, project, thisArg) {
          _super.call(this, destination);
          this.project = project;
          this.count = 0;
          this.thisArg = thisArg || this;
      }
      // NOTE: This looks unoptimized, but it's actually purposefully NOT
      // using try/catch optimizations.
      MapSubscriber.prototype._next = function (value) {
          var result;
          try {
              result = this.project.call(this.thisArg, value, this.count++);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.destination.next(result);
      };
      return MapSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=map.js.map

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var Notification_1 = __webpack_require__(20);
  /**
   * @see {@link Notification}
   *
   * @param scheduler
   * @param delay
   * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
   * @method observeOn
   * @owner Observable
   */
  function observeOn(scheduler, delay) {
      if (delay === void 0) { delay = 0; }
      return this.lift(new ObserveOnOperator(scheduler, delay));
  }
  exports.observeOn = observeOn;
  var ObserveOnOperator = (function () {
      function ObserveOnOperator(scheduler, delay) {
          if (delay === void 0) { delay = 0; }
          this.scheduler = scheduler;
          this.delay = delay;
      }
      ObserveOnOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ObserveOnSubscriber(subscriber, this.scheduler, this.delay));
      };
      return ObserveOnOperator;
  }());
  exports.ObserveOnOperator = ObserveOnOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ObserveOnSubscriber = (function (_super) {
      __extends(ObserveOnSubscriber, _super);
      function ObserveOnSubscriber(destination, scheduler, delay) {
          if (delay === void 0) { delay = 0; }
          _super.call(this, destination);
          this.scheduler = scheduler;
          this.delay = delay;
      }
      ObserveOnSubscriber.dispatch = function (arg) {
          var notification = arg.notification, destination = arg.destination;
          notification.observe(destination);
      };
      ObserveOnSubscriber.prototype.scheduleMessage = function (notification) {
          this.add(this.scheduler.schedule(ObserveOnSubscriber.dispatch, this.delay, new ObserveOnMessage(notification, this.destination)));
      };
      ObserveOnSubscriber.prototype._next = function (value) {
          this.scheduleMessage(Notification_1.Notification.createNext(value));
      };
      ObserveOnSubscriber.prototype._error = function (err) {
          this.scheduleMessage(Notification_1.Notification.createError(err));
      };
      ObserveOnSubscriber.prototype._complete = function () {
          this.scheduleMessage(Notification_1.Notification.createComplete());
      };
      return ObserveOnSubscriber;
  }(Subscriber_1.Subscriber));
  exports.ObserveOnSubscriber = ObserveOnSubscriber;
  var ObserveOnMessage = (function () {
      function ObserveOnMessage(notification, destination) {
          this.notification = notification;
          this.destination = destination;
      }
      return ObserveOnMessage;
  }());
  exports.ObserveOnMessage = ObserveOnMessage;
  //# sourceMappingURL=observeOn.js.map

/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /* tslint:disable:max-line-length */
  function reduce(accumulator, seed) {
      return this.lift(new ReduceOperator(accumulator, seed));
  }
  exports.reduce = reduce;
  var ReduceOperator = (function () {
      function ReduceOperator(accumulator, seed) {
          this.accumulator = accumulator;
          this.seed = seed;
      }
      ReduceOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ReduceSubscriber(subscriber, this.accumulator, this.seed));
      };
      return ReduceOperator;
  }());
  exports.ReduceOperator = ReduceOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ReduceSubscriber = (function (_super) {
      __extends(ReduceSubscriber, _super);
      function ReduceSubscriber(destination, accumulator, seed) {
          _super.call(this, destination);
          this.accumulator = accumulator;
          this.hasValue = false;
          this.acc = seed;
          this.accumulator = accumulator;
          this.hasSeed = typeof seed !== 'undefined';
      }
      ReduceSubscriber.prototype._next = function (value) {
          if (this.hasValue || (this.hasValue = this.hasSeed)) {
              this._tryReduce(value);
          }
          else {
              this.acc = value;
              this.hasValue = true;
          }
      };
      ReduceSubscriber.prototype._tryReduce = function (value) {
          var result;
          try {
              result = this.accumulator(this.acc, value);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.acc = result;
      };
      ReduceSubscriber.prototype._complete = function () {
          if (this.hasValue || this.hasSeed) {
              this.destination.next(this.acc);
          }
          this.destination.complete();
      };
      return ReduceSubscriber;
  }(Subscriber_1.Subscriber));
  exports.ReduceSubscriber = ReduceSubscriber;
  //# sourceMappingURL=reduce.js.map

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var ArrayObservable_1 = __webpack_require__(12);
  var isArray_1 = __webpack_require__(11);
  var Subscriber_1 = __webpack_require__(2);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  var iterator_1 = __webpack_require__(23);
  /* tslint:disable:max-line-length */
  function zipProto() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      return this.lift.call(zipStatic.apply(void 0, [this].concat(observables)));
  }
  exports.zipProto = zipProto;
  /* tslint:enable:max-line-length */
  /**
   * @param observables
   * @return {Observable<R>}
   * @static true
   * @name zip
   * @owner Observable
   */
  function zipStatic() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      var project = observables[observables.length - 1];
      if (typeof project === 'function') {
          observables.pop();
      }
      return new ArrayObservable_1.ArrayObservable(observables).lift(new ZipOperator(project));
  }
  exports.zipStatic = zipStatic;
  var ZipOperator = (function () {
      function ZipOperator(project) {
          this.project = project;
      }
      ZipOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ZipSubscriber(subscriber, this.project));
      };
      return ZipOperator;
  }());
  exports.ZipOperator = ZipOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ZipSubscriber = (function (_super) {
      __extends(ZipSubscriber, _super);
      function ZipSubscriber(destination, project, values) {
          if (values === void 0) { values = Object.create(null); }
          _super.call(this, destination);
          this.index = 0;
          this.iterators = [];
          this.active = 0;
          this.project = (typeof project === 'function') ? project : null;
          this.values = values;
      }
      ZipSubscriber.prototype._next = function (value) {
          var iterators = this.iterators;
          var index = this.index++;
          if (isArray_1.isArray(value)) {
              iterators.push(new StaticArrayIterator(value));
          }
          else if (typeof value[iterator_1.$$iterator] === 'function') {
              iterators.push(new StaticIterator(value[iterator_1.$$iterator]()));
          }
          else {
              iterators.push(new ZipBufferIterator(this.destination, this, value, index));
          }
      };
      ZipSubscriber.prototype._complete = function () {
          var iterators = this.iterators;
          var len = iterators.length;
          this.active = len;
          for (var i = 0; i < len; i++) {
              var iterator = iterators[i];
              if (iterator.stillUnsubscribed) {
                  this.add(iterator.subscribe(iterator, i));
              }
              else {
                  this.active--; // not an observable
              }
          }
      };
      ZipSubscriber.prototype.notifyInactive = function () {
          this.active--;
          if (this.active === 0) {
              this.destination.complete();
          }
      };
      ZipSubscriber.prototype.checkIterators = function () {
          var iterators = this.iterators;
          var len = iterators.length;
          var destination = this.destination;
          // abort if not all of them have values
          for (var i = 0; i < len; i++) {
              var iterator = iterators[i];
              if (typeof iterator.hasValue === 'function' && !iterator.hasValue()) {
                  return;
              }
          }
          var shouldComplete = false;
          var args = [];
          for (var i = 0; i < len; i++) {
              var iterator = iterators[i];
              var result = iterator.next();
              // check to see if it's completed now that you've gotten
              // the next value.
              if (iterator.hasCompleted()) {
                  shouldComplete = true;
              }
              if (result.done) {
                  destination.complete();
                  return;
              }
              args.push(result.value);
          }
          if (this.project) {
              this._tryProject(args);
          }
          else {
              destination.next(args);
          }
          if (shouldComplete) {
              destination.complete();
          }
      };
      ZipSubscriber.prototype._tryProject = function (args) {
          var result;
          try {
              result = this.project.apply(this, args);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.destination.next(result);
      };
      return ZipSubscriber;
  }(Subscriber_1.Subscriber));
  exports.ZipSubscriber = ZipSubscriber;
  var StaticIterator = (function () {
      function StaticIterator(iterator) {
          this.iterator = iterator;
          this.nextResult = iterator.next();
      }
      StaticIterator.prototype.hasValue = function () {
          return true;
      };
      StaticIterator.prototype.next = function () {
          var result = this.nextResult;
          this.nextResult = this.iterator.next();
          return result;
      };
      StaticIterator.prototype.hasCompleted = function () {
          var nextResult = this.nextResult;
          return nextResult && nextResult.done;
      };
      return StaticIterator;
  }());
  var StaticArrayIterator = (function () {
      function StaticArrayIterator(array) {
          this.array = array;
          this.index = 0;
          this.length = 0;
          this.length = array.length;
      }
      StaticArrayIterator.prototype[iterator_1.$$iterator] = function () {
          return this;
      };
      StaticArrayIterator.prototype.next = function (value) {
          var i = this.index++;
          var array = this.array;
          return i < this.length ? { value: array[i], done: false } : { value: null, done: true };
      };
      StaticArrayIterator.prototype.hasValue = function () {
          return this.array.length > this.index;
      };
      StaticArrayIterator.prototype.hasCompleted = function () {
          return this.array.length === this.index;
      };
      return StaticArrayIterator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ZipBufferIterator = (function (_super) {
      __extends(ZipBufferIterator, _super);
      function ZipBufferIterator(destination, parent, observable, index) {
          _super.call(this, destination);
          this.parent = parent;
          this.observable = observable;
          this.index = index;
          this.stillUnsubscribed = true;
          this.buffer = [];
          this.isComplete = false;
      }
      ZipBufferIterator.prototype[iterator_1.$$iterator] = function () {
          return this;
      };
      // NOTE: there is actually a name collision here with Subscriber.next and Iterator.next
      //    this is legit because `next()` will never be called by a subscription in this case.
      ZipBufferIterator.prototype.next = function () {
          var buffer = this.buffer;
          if (buffer.length === 0 && this.isComplete) {
              return { value: null, done: true };
          }
          else {
              return { value: buffer.shift(), done: false };
          }
      };
      ZipBufferIterator.prototype.hasValue = function () {
          return this.buffer.length > 0;
      };
      ZipBufferIterator.prototype.hasCompleted = function () {
          return this.buffer.length === 0 && this.isComplete;
      };
      ZipBufferIterator.prototype.notifyComplete = function () {
          if (this.buffer.length > 0) {
              this.isComplete = true;
              this.parent.notifyInactive();
          }
          else {
              this.destination.complete();
          }
      };
      ZipBufferIterator.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.buffer.push(innerValue);
          this.parent.checkIterators();
      };
      ZipBufferIterator.prototype.subscribe = function (value, index) {
          return subscribeToResult_1.subscribeToResult(this, this.observable, this, index);
      };
      return ZipBufferIterator;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=zip.js.map

/***/ },
/* 43 */
/***/ function(module, exports) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  /**
   * An error thrown when an action is invalid because the object has been
   * unsubscribed.
   *
   * @see {@link Subject}
   * @see {@link BehaviorSubject}
   *
   * @class ObjectUnsubscribedError
   */
  var ObjectUnsubscribedError = (function (_super) {
      __extends(ObjectUnsubscribedError, _super);
      function ObjectUnsubscribedError() {
          var err = _super.call(this, 'object unsubscribed');
          this.name = err.name = 'ObjectUnsubscribedError';
          this.stack = err.stack;
          this.message = err.message;
      }
      return ObjectUnsubscribedError;
  }(Error));
  exports.ObjectUnsubscribedError = ObjectUnsubscribedError;
  //# sourceMappingURL=ObjectUnsubscribedError.js.map

/***/ },
/* 44 */
/***/ function(module, exports) {

  "use strict";
  function isFunction(x) {
      return typeof x === 'function';
  }
  exports.isFunction = isFunction;
  //# sourceMappingURL=isFunction.js.map

/***/ },
/* 45 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var isArray_1 = __webpack_require__(11);
  function isNumeric(val) {
      // parseFloat NaNs numeric-cast false positives (null|true|false|"")
      // ...but misinterprets leading-number strings, particularly hex literals ("0x...")
      // subtraction forces infinities to NaN
      // adding 1 corrects loss of precision from parseFloat (#15100)
      return !isArray_1.isArray(val) && (val - parseFloat(val) + 1) >= 0;
  }
  exports.isNumeric = isNumeric;
  ;
  //# sourceMappingURL=isNumeric.js.map

/***/ },
/* 46 */,
/* 47 */,
/* 48 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * Module dependencies.
   */

  var keys = __webpack_require__(484);
  var hasBinary = __webpack_require__(485);
  var sliceBuffer = __webpack_require__(426);
  var base64encoder = __webpack_require__(429);
  var after = __webpack_require__(424);
  var utf8 = __webpack_require__(534);

  /**
   * Check if we are running an android browser. That requires us to use
   * ArrayBuffer with polling transports...
   *
   * http://ghinda.net/jpeg-blob-ajax-android/
   */

  var isAndroid = navigator.userAgent.match(/Android/i);

  /**
   * Check if we are running in PhantomJS.
   * Uploading a Blob with PhantomJS does not work correctly, as reported here:
   * https://github.com/ariya/phantomjs/issues/11395
   * @type boolean
   */
  var isPhantomJS = /PhantomJS/i.test(navigator.userAgent);

  /**
   * When true, avoids using Blobs to encode payloads.
   * @type boolean
   */
  var dontSendBlobs = isAndroid || isPhantomJS;

  /**
   * Current protocol version.
   */

  exports.protocol = 3;

  /**
   * Packet types.
   */

  var packets = exports.packets = {
      open:     0    // non-ws
    , close:    1    // non-ws
    , ping:     2
    , pong:     3
    , message:  4
    , upgrade:  5
    , noop:     6
  };

  var packetslist = keys(packets);

  /**
   * Premade error packet.
   */

  var err = { type: 'error', data: 'parser error' };

  /**
   * Create a blob api even for blob builder when vendor prefixes exist
   */

  var Blob = __webpack_require__(431);

  /**
   * Encodes a packet.
   *
   *     <packet type id> [ <data> ]
   *
   * Example:
   *
   *     5hello world
   *     3
   *     4
   *
   * Binary is encoded in an identical principle
   *
   * @api private
   */

  exports.encodePacket = function (packet, supportsBinary, utf8encode, callback) {
    if ('function' == typeof supportsBinary) {
      callback = supportsBinary;
      supportsBinary = false;
    }

    if ('function' == typeof utf8encode) {
      callback = utf8encode;
      utf8encode = null;
    }

    var data = (packet.data === undefined)
      ? undefined
      : packet.data.buffer || packet.data;

    if (global.ArrayBuffer && data instanceof ArrayBuffer) {
      return encodeArrayBuffer(packet, supportsBinary, callback);
    } else if (Blob && data instanceof global.Blob) {
      return encodeBlob(packet, supportsBinary, callback);
    }

    // might be an object with { base64: true, data: dataAsBase64String }
    if (data && data.base64) {
      return encodeBase64Object(packet, callback);
    }

    // Sending data as a utf-8 string
    var encoded = packets[packet.type];

    // data fragment is optional
    if (undefined !== packet.data) {
      encoded += utf8encode ? utf8.encode(String(packet.data)) : String(packet.data);
    }

    return callback('' + encoded);

  };

  function encodeBase64Object(packet, callback) {
    // packet data is an object { base64: true, data: dataAsBase64String }
    var message = 'b' + exports.packets[packet.type] + packet.data.data;
    return callback(message);
  }

  /**
   * Encode packet helpers for binary types
   */

  function encodeArrayBuffer(packet, supportsBinary, callback) {
    if (!supportsBinary) {
      return exports.encodeBase64Packet(packet, callback);
    }

    var data = packet.data;
    var contentArray = new Uint8Array(data);
    var resultBuffer = new Uint8Array(1 + data.byteLength);

    resultBuffer[0] = packets[packet.type];
    for (var i = 0; i < contentArray.length; i++) {
      resultBuffer[i+1] = contentArray[i];
    }

    return callback(resultBuffer.buffer);
  }

  function encodeBlobAsArrayBuffer(packet, supportsBinary, callback) {
    if (!supportsBinary) {
      return exports.encodeBase64Packet(packet, callback);
    }

    var fr = new FileReader();
    fr.onload = function() {
      packet.data = fr.result;
      exports.encodePacket(packet, supportsBinary, true, callback);
    };
    return fr.readAsArrayBuffer(packet.data);
  }

  function encodeBlob(packet, supportsBinary, callback) {
    if (!supportsBinary) {
      return exports.encodeBase64Packet(packet, callback);
    }

    if (dontSendBlobs) {
      return encodeBlobAsArrayBuffer(packet, supportsBinary, callback);
    }

    var length = new Uint8Array(1);
    length[0] = packets[packet.type];
    var blob = new Blob([length.buffer, packet.data]);

    return callback(blob);
  }

  /**
   * Encodes a packet with binary data in a base64 string
   *
   * @param {Object} packet, has `type` and `data`
   * @return {String} base64 encoded message
   */

  exports.encodeBase64Packet = function(packet, callback) {
    var message = 'b' + exports.packets[packet.type];
    if (Blob && packet.data instanceof global.Blob) {
      var fr = new FileReader();
      fr.onload = function() {
        var b64 = fr.result.split(',')[1];
        callback(message + b64);
      };
      return fr.readAsDataURL(packet.data);
    }

    var b64data;
    try {
      b64data = String.fromCharCode.apply(null, new Uint8Array(packet.data));
    } catch (e) {
      // iPhone Safari doesn't let you apply with typed arrays
      var typed = new Uint8Array(packet.data);
      var basic = new Array(typed.length);
      for (var i = 0; i < typed.length; i++) {
        basic[i] = typed[i];
      }
      b64data = String.fromCharCode.apply(null, basic);
    }
    message += global.btoa(b64data);
    return callback(message);
  };

  /**
   * Decodes a packet. Changes format to Blob if requested.
   *
   * @return {Object} with `type` and `data` (if any)
   * @api private
   */

  exports.decodePacket = function (data, binaryType, utf8decode) {
    // String data
    if (typeof data == 'string' || data === undefined) {
      if (data.charAt(0) == 'b') {
        return exports.decodeBase64Packet(data.substr(1), binaryType);
      }

      if (utf8decode) {
        try {
          data = utf8.decode(data);
        } catch (e) {
          return err;
        }
      }
      var type = data.charAt(0);

      if (Number(type) != type || !packetslist[type]) {
        return err;
      }

      if (data.length > 1) {
        return { type: packetslist[type], data: data.substring(1) };
      } else {
        return { type: packetslist[type] };
      }
    }

    var asArray = new Uint8Array(data);
    var type = asArray[0];
    var rest = sliceBuffer(data, 1);
    if (Blob && binaryType === 'blob') {
      rest = new Blob([rest]);
    }
    return { type: packetslist[type], data: rest };
  };

  /**
   * Decodes a packet encoded in a base64 string
   *
   * @param {String} base64 encoded message
   * @return {Object} with `type` and `data` (if any)
   */

  exports.decodeBase64Packet = function(msg, binaryType) {
    var type = packetslist[msg.charAt(0)];
    if (!global.ArrayBuffer) {
      return { type: type, data: { base64: true, data: msg.substr(1) } };
    }

    var data = base64encoder.decode(msg.substr(1));

    if (binaryType === 'blob' && Blob) {
      data = new Blob([data]);
    }

    return { type: type, data: data };
  };

  /**
   * Encodes multiple messages (payload).
   *
   *     <length>:data
   *
   * Example:
   *
   *     11:hello world2:hi
   *
   * If any contents are binary, they will be encoded as base64 strings. Base64
   * encoded strings are marked with a b before the length specifier
   *
   * @param {Array} packets
   * @api private
   */

  exports.encodePayload = function (packets, supportsBinary, callback) {
    if (typeof supportsBinary == 'function') {
      callback = supportsBinary;
      supportsBinary = null;
    }

    var isBinary = hasBinary(packets);

    if (supportsBinary && isBinary) {
      if (Blob && !dontSendBlobs) {
        return exports.encodePayloadAsBlob(packets, callback);
      }

      return exports.encodePayloadAsArrayBuffer(packets, callback);
    }

    if (!packets.length) {
      return callback('0:');
    }

    function setLengthHeader(message) {
      return message.length + ':' + message;
    }

    function encodeOne(packet, doneCallback) {
      exports.encodePacket(packet, !isBinary ? false : supportsBinary, true, function(message) {
        doneCallback(null, setLengthHeader(message));
      });
    }

    map(packets, encodeOne, function(err, results) {
      return callback(results.join(''));
    });
  };

  /**
   * Async array map using after
   */

  function map(ary, each, done) {
    var result = new Array(ary.length);
    var next = after(ary.length, done);

    var eachWithIndex = function(i, el, cb) {
      each(el, function(error, msg) {
        result[i] = msg;
        cb(error, result);
      });
    };

    for (var i = 0; i < ary.length; i++) {
      eachWithIndex(i, ary[i], next);
    }
  }

  /*
   * Decodes data when a payload is maybe expected. Possible binary contents are
   * decoded from their base64 representation
   *
   * @param {String} data, callback method
   * @api public
   */

  exports.decodePayload = function (data, binaryType, callback) {
    if (typeof data != 'string') {
      return exports.decodePayloadAsBinary(data, binaryType, callback);
    }

    if (typeof binaryType === 'function') {
      callback = binaryType;
      binaryType = null;
    }

    var packet;
    if (data == '') {
      // parser error - ignoring payload
      return callback(err, 0, 1);
    }

    var length = ''
      , n, msg;

    for (var i = 0, l = data.length; i < l; i++) {
      var chr = data.charAt(i);

      if (':' != chr) {
        length += chr;
      } else {
        if ('' == length || (length != (n = Number(length)))) {
          // parser error - ignoring payload
          return callback(err, 0, 1);
        }

        msg = data.substr(i + 1, n);

        if (length != msg.length) {
          // parser error - ignoring payload
          return callback(err, 0, 1);
        }

        if (msg.length) {
          packet = exports.decodePacket(msg, binaryType, true);

          if (err.type == packet.type && err.data == packet.data) {
            // parser error in individual packet - ignoring payload
            return callback(err, 0, 1);
          }

          var ret = callback(packet, i + n, l);
          if (false === ret) return;
        }

        // advance cursor
        i += n;
        length = '';
      }
    }

    if (length != '') {
      // parser error - ignoring payload
      return callback(err, 0, 1);
    }

  };

  /**
   * Encodes multiple messages (payload) as binary.
   *
   * <1 = binary, 0 = string><number from 0-9><number from 0-9>[...]<number
   * 255><data>
   *
   * Example:
   * 1 3 255 1 2 3, if the binary contents are interpreted as 8 bit integers
   *
   * @param {Array} packets
   * @return {ArrayBuffer} encoded payload
   * @api private
   */

  exports.encodePayloadAsArrayBuffer = function(packets, callback) {
    if (!packets.length) {
      return callback(new ArrayBuffer(0));
    }

    function encodeOne(packet, doneCallback) {
      exports.encodePacket(packet, true, true, function(data) {
        return doneCallback(null, data);
      });
    }

    map(packets, encodeOne, function(err, encodedPackets) {
      var totalLength = encodedPackets.reduce(function(acc, p) {
        var len;
        if (typeof p === 'string'){
          len = p.length;
        } else {
          len = p.byteLength;
        }
        return acc + len.toString().length + len + 2; // string/binary identifier + separator = 2
      }, 0);

      var resultArray = new Uint8Array(totalLength);

      var bufferIndex = 0;
      encodedPackets.forEach(function(p) {
        var isString = typeof p === 'string';
        var ab = p;
        if (isString) {
          var view = new Uint8Array(p.length);
          for (var i = 0; i < p.length; i++) {
            view[i] = p.charCodeAt(i);
          }
          ab = view.buffer;
        }

        if (isString) { // not true binary
          resultArray[bufferIndex++] = 0;
        } else { // true binary
          resultArray[bufferIndex++] = 1;
        }

        var lenStr = ab.byteLength.toString();
        for (var i = 0; i < lenStr.length; i++) {
          resultArray[bufferIndex++] = parseInt(lenStr[i]);
        }
        resultArray[bufferIndex++] = 255;

        var view = new Uint8Array(ab);
        for (var i = 0; i < view.length; i++) {
          resultArray[bufferIndex++] = view[i];
        }
      });

      return callback(resultArray.buffer);
    });
  };

  /**
   * Encode as Blob
   */

  exports.encodePayloadAsBlob = function(packets, callback) {
    function encodeOne(packet, doneCallback) {
      exports.encodePacket(packet, true, true, function(encoded) {
        var binaryIdentifier = new Uint8Array(1);
        binaryIdentifier[0] = 1;
        if (typeof encoded === 'string') {
          var view = new Uint8Array(encoded.length);
          for (var i = 0; i < encoded.length; i++) {
            view[i] = encoded.charCodeAt(i);
          }
          encoded = view.buffer;
          binaryIdentifier[0] = 0;
        }

        var len = (encoded instanceof ArrayBuffer)
          ? encoded.byteLength
          : encoded.size;

        var lenStr = len.toString();
        var lengthAry = new Uint8Array(lenStr.length + 1);
        for (var i = 0; i < lenStr.length; i++) {
          lengthAry[i] = parseInt(lenStr[i]);
        }
        lengthAry[lenStr.length] = 255;

        if (Blob) {
          var blob = new Blob([binaryIdentifier.buffer, lengthAry.buffer, encoded]);
          doneCallback(null, blob);
        }
      });
    }

    map(packets, encodeOne, function(err, results) {
      return callback(new Blob(results));
    });
  };

  /*
   * Decodes data when a payload is maybe expected. Strings are decoded by
   * interpreting each byte as a key code for entries marked to start with 0. See
   * description of encodePayloadAsBinary
   *
   * @param {ArrayBuffer} data, callback method
   * @api public
   */

  exports.decodePayloadAsBinary = function (data, binaryType, callback) {
    if (typeof binaryType === 'function') {
      callback = binaryType;
      binaryType = null;
    }

    var bufferTail = data;
    var buffers = [];

    var numberTooLong = false;
    while (bufferTail.byteLength > 0) {
      var tailArray = new Uint8Array(bufferTail);
      var isString = tailArray[0] === 0;
      var msgLength = '';

      for (var i = 1; ; i++) {
        if (tailArray[i] == 255) break;

        if (msgLength.length > 310) {
          numberTooLong = true;
          break;
        }

        msgLength += tailArray[i];
      }

      if(numberTooLong) return callback(err, 0, 1);

      bufferTail = sliceBuffer(bufferTail, 2 + msgLength.length);
      msgLength = parseInt(msgLength);

      var msg = sliceBuffer(bufferTail, 0, msgLength);
      if (isString) {
        try {
          msg = String.fromCharCode.apply(null, new Uint8Array(msg));
        } catch (e) {
          // iPhone Safari doesn't let you apply to typed arrays
          var typed = new Uint8Array(msg);
          msg = '';
          for (var i = 0; i < typed.length; i++) {
            msg += String.fromCharCode(typed[i]);
          }
        }
      }

      buffers.push(msg);
      bufferTail = sliceBuffer(bufferTail, msgLength);
    }

    var total = buffers.length;
    buffers.forEach(function(buffer, i) {
      callback(exports.decodePacket(buffer, binaryType, true), i, total);
    });
  };

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 49 */,
/* 50 */,
/* 51 */,
/* 52 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var ObjectUnsubscribedError_1 = __webpack_require__(43);
  /**
   * @class BehaviorSubject<T>
   */
  var BehaviorSubject = (function (_super) {
      __extends(BehaviorSubject, _super);
      function BehaviorSubject(_value) {
          _super.call(this);
          this._value = _value;
      }
      Object.defineProperty(BehaviorSubject.prototype, "value", {
          get: function () {
              return this.getValue();
          },
          enumerable: true,
          configurable: true
      });
      BehaviorSubject.prototype._subscribe = function (subscriber) {
          var subscription = _super.prototype._subscribe.call(this, subscriber);
          if (subscription && !subscription.closed) {
              subscriber.next(this._value);
          }
          return subscription;
      };
      BehaviorSubject.prototype.getValue = function () {
          if (this.hasError) {
              throw this.thrownError;
          }
          else if (this.closed) {
              throw new ObjectUnsubscribedError_1.ObjectUnsubscribedError();
          }
          else {
              return this._value;
          }
      };
      BehaviorSubject.prototype.next = function (value) {
          _super.prototype.next.call(this, this._value = value);
      };
      return BehaviorSubject;
  }(Subject_1.Subject));
  exports.BehaviorSubject = BehaviorSubject;
  //# sourceMappingURL=BehaviorSubject.js.map

/***/ },
/* 53 */
/***/ function(module, exports) {

  "use strict";
  exports.empty = {
      closed: true,
      next: function (value) { },
      error: function (err) { throw err; },
      complete: function () { }
  };
  //# sourceMappingURL=Observer.js.map

/***/ },
/* 54 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var Observable_1 = __webpack_require__(1);
  var Subscriber_1 = __webpack_require__(2);
  var Subscription_1 = __webpack_require__(6);
  /**
   * @class ConnectableObservable<T>
   */
  var ConnectableObservable = (function (_super) {
      __extends(ConnectableObservable, _super);
      function ConnectableObservable(source, subjectFactory) {
          _super.call(this);
          this.source = source;
          this.subjectFactory = subjectFactory;
          this._refCount = 0;
      }
      ConnectableObservable.prototype._subscribe = function (subscriber) {
          return this.getSubject().subscribe(subscriber);
      };
      ConnectableObservable.prototype.getSubject = function () {
          var subject = this._subject;
          if (!subject || subject.isStopped) {
              this._subject = this.subjectFactory();
          }
          return this._subject;
      };
      ConnectableObservable.prototype.connect = function () {
          var connection = this._connection;
          if (!connection) {
              connection = this._connection = new Subscription_1.Subscription();
              connection.add(this.source
                  .subscribe(new ConnectableSubscriber(this.getSubject(), this)));
              if (connection.closed) {
                  this._connection = null;
                  connection = Subscription_1.Subscription.EMPTY;
              }
              else {
                  this._connection = connection;
              }
          }
          return connection;
      };
      ConnectableObservable.prototype.refCount = function () {
          return this.lift(new RefCountOperator(this));
      };
      return ConnectableObservable;
  }(Observable_1.Observable));
  exports.ConnectableObservable = ConnectableObservable;
  exports.connectableObservableDescriptor = {
      operator: { value: null },
      _refCount: { value: 0, writable: true },
      _subscribe: { value: ConnectableObservable.prototype._subscribe },
      getSubject: { value: ConnectableObservable.prototype.getSubject },
      connect: { value: ConnectableObservable.prototype.connect },
      refCount: { value: ConnectableObservable.prototype.refCount }
  };
  var ConnectableSubscriber = (function (_super) {
      __extends(ConnectableSubscriber, _super);
      function ConnectableSubscriber(destination, connectable) {
          _super.call(this, destination);
          this.connectable = connectable;
      }
      ConnectableSubscriber.prototype._error = function (err) {
          this._unsubscribe();
          _super.prototype._error.call(this, err);
      };
      ConnectableSubscriber.prototype._complete = function () {
          this._unsubscribe();
          _super.prototype._complete.call(this);
      };
      ConnectableSubscriber.prototype._unsubscribe = function () {
          var connectable = this.connectable;
          if (connectable) {
              this.connectable = null;
              var connection = connectable._connection;
              connectable._refCount = 0;
              connectable._subject = null;
              connectable._connection = null;
              if (connection) {
                  connection.unsubscribe();
              }
          }
      };
      return ConnectableSubscriber;
  }(Subject_1.SubjectSubscriber));
  var RefCountOperator = (function () {
      function RefCountOperator(connectable) {
          this.connectable = connectable;
      }
      RefCountOperator.prototype.call = function (subscriber, source) {
          var connectable = this.connectable;
          connectable._refCount++;
          var refCounter = new RefCountSubscriber(subscriber, connectable);
          var subscription = source._subscribe(refCounter);
          if (!refCounter.closed) {
              refCounter.connection = connectable.connect();
          }
          return subscription;
      };
      return RefCountOperator;
  }());
  var RefCountSubscriber = (function (_super) {
      __extends(RefCountSubscriber, _super);
      function RefCountSubscriber(destination, connectable) {
          _super.call(this, destination);
          this.connectable = connectable;
      }
      RefCountSubscriber.prototype._unsubscribe = function () {
          var connectable = this.connectable;
          if (!connectable) {
              this.connection = null;
              return;
          }
          this.connectable = null;
          var refCount = connectable._refCount;
          if (refCount <= 0) {
              this.connection = null;
              return;
          }
          connectable._refCount = refCount - 1;
          if (refCount > 1) {
              this.connection = null;
              return;
          }
          ///
          // Compare the local RefCountSubscriber's connection Subscription to the
          // connection Subscription on the shared ConnectableObservable. In cases
          // where the ConnectableObservable source synchronously emits values, and
          // the RefCountSubscriber's dowstream Observers synchronously unsubscribe,
          // execution continues to here before the RefCountOperator has a chance to
          // supply the RefCountSubscriber with the shared connection Subscription.
          // For example:
          // ```
          // Observable.range(0, 10)
          //   .publish()
          //   .refCount()
          //   .take(5)
          //   .subscribe();
          // ```
          // In order to account for this case, RefCountSubscriber should only dispose
          // the ConnectableObservable's shared connection Subscription if the
          // connection Subscription exists, *and* either:
          //   a. RefCountSubscriber doesn't have a reference to the shared connection
          //      Subscription yet, or,
          //   b. RefCountSubscriber's connection Subscription reference is identical
          //      to the shared connection Subscription
          ///
          var connection = this.connection;
          var sharedConnection = connectable._connection;
          this.connection = null;
          if (sharedConnection && (!connection || sharedConnection === connection)) {
              sharedConnection.unsubscribe();
          }
      };
      return RefCountSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=ConnectableObservable.js.map

/***/ },
/* 55 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var isArray_1 = __webpack_require__(11);
  var isPromise_1 = __webpack_require__(77);
  var PromiseObservable_1 = __webpack_require__(56);
  var IteratorObservable_1 = __webpack_require__(246);
  var ArrayObservable_1 = __webpack_require__(12);
  var ArrayLikeObservable_1 = __webpack_require__(235);
  var iterator_1 = __webpack_require__(23);
  var Observable_1 = __webpack_require__(1);
  var observeOn_1 = __webpack_require__(40);
  var observable_1 = __webpack_require__(27);
  var isArrayLike = (function (x) { return x && typeof x.length === 'number'; });
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var FromObservable = (function (_super) {
      __extends(FromObservable, _super);
      function FromObservable(ish, scheduler) {
          _super.call(this, null);
          this.ish = ish;
          this.scheduler = scheduler;
      }
      /**
       * Creates an Observable from an Array, an array-like object, a Promise, an
       * iterable object, or an Observable-like object.
       *
       * <span class="informal">Converts almost anything to an Observable.</span>
       *
       * <img src="./img/from.png" width="100%">
       *
       * Convert various other objects and data types into Observables. `from`
       * converts a Promise or an array-like or an
       * [iterable](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#iterable)
       * object into an Observable that emits the items in that promise or array or
       * iterable. A String, in this context, is treated as an array of characters.
       * Observable-like objects (contains a function named with the ES2015 Symbol
       * for Observable) can also be converted through this operator.
       *
       * @example <caption>Converts an array to an Observable</caption>
       * var array = [10, 20, 30];
       * var result = Rx.Observable.from(array);
       * result.subscribe(x => console.log(x));
       *
       * @example <caption>Convert an infinite iterable (from a generator) to an Observable</caption>
       * function* generateDoubles(seed) {
       *   var i = seed;
       *   while (true) {
       *     yield i;
       *     i = 2 * i; // double it
       *   }
       * }
       *
       * var iterator = generateDoubles(3);
       * var result = Rx.Observable.from(iterator).take(10);
       * result.subscribe(x => console.log(x));
       *
       * @see {@link create}
       * @see {@link fromEvent}
       * @see {@link fromEventPattern}
       * @see {@link fromPromise}
       *
       * @param {ObservableInput<T>} ish A subscribable object, a Promise, an
       * Observable-like, an Array, an iterable or an array-like object to be
       * converted.
       * @param {Scheduler} [scheduler] The scheduler on which to schedule the
       * emissions of values.
       * @return {Observable<T>} The Observable whose values are originally from the
       * input object that was converted.
       * @static true
       * @name from
       * @owner Observable
       */
      FromObservable.create = function (ish, scheduler) {
          if (ish != null) {
              if (typeof ish[observable_1.$$observable] === 'function') {
                  if (ish instanceof Observable_1.Observable && !scheduler) {
                      return ish;
                  }
                  return new FromObservable(ish, scheduler);
              }
              else if (isArray_1.isArray(ish)) {
                  return new ArrayObservable_1.ArrayObservable(ish, scheduler);
              }
              else if (isPromise_1.isPromise(ish)) {
                  return new PromiseObservable_1.PromiseObservable(ish, scheduler);
              }
              else if (typeof ish[iterator_1.$$iterator] === 'function' || typeof ish === 'string') {
                  return new IteratorObservable_1.IteratorObservable(ish, scheduler);
              }
              else if (isArrayLike(ish)) {
                  return new ArrayLikeObservable_1.ArrayLikeObservable(ish, scheduler);
              }
          }
          throw new TypeError((ish !== null && typeof ish || ish) + ' is not observable');
      };
      FromObservable.prototype._subscribe = function (subscriber) {
          var ish = this.ish;
          var scheduler = this.scheduler;
          if (scheduler == null) {
              return ish[observable_1.$$observable]().subscribe(subscriber);
          }
          else {
              return ish[observable_1.$$observable]().subscribe(new observeOn_1.ObserveOnSubscriber(subscriber, scheduler, 0));
          }
      };
      return FromObservable;
  }(Observable_1.Observable));
  exports.FromObservable = FromObservable;
  //# sourceMappingURL=FromObservable.js.map

/***/ },
/* 56 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var root_1 = __webpack_require__(9);
  var Observable_1 = __webpack_require__(1);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var PromiseObservable = (function (_super) {
      __extends(PromiseObservable, _super);
      function PromiseObservable(promise, scheduler) {
          _super.call(this);
          this.promise = promise;
          this.scheduler = scheduler;
      }
      /**
       * Converts a Promise to an Observable.
       *
       * <span class="informal">Returns an Observable that just emits the Promise's
       * resolved value, then completes.</span>
       *
       * Converts an ES2015 Promise or a Promises/A+ spec compliant Promise to an
       * Observable. If the Promise resolves with a value, the output Observable
       * emits that resolved value as a `next`, and then completes. If the Promise
       * is rejected, then the output Observable emits the corresponding Error.
       *
       * @example <caption>Convert the Promise returned by Fetch to an Observable</caption>
       * var result = Rx.Observable.fromPromise(fetch('http://myserver.com/'));
       * result.subscribe(x => console.log(x), e => console.error(e));
       *
       * @see {@link bindCallback}
       * @see {@link from}
       *
       * @param {Promise<T>} promise The promise to be converted.
       * @param {Scheduler} [scheduler] An optional Scheduler to use for scheduling
       * the delivery of the resolved value (or the rejection).
       * @return {Observable<T>} An Observable which wraps the Promise.
       * @static true
       * @name fromPromise
       * @owner Observable
       */
      PromiseObservable.create = function (promise, scheduler) {
          return new PromiseObservable(promise, scheduler);
      };
      PromiseObservable.prototype._subscribe = function (subscriber) {
          var _this = this;
          var promise = this.promise;
          var scheduler = this.scheduler;
          if (scheduler == null) {
              if (this._isScalar) {
                  if (!subscriber.closed) {
                      subscriber.next(this.value);
                      subscriber.complete();
                  }
              }
              else {
                  promise.then(function (value) {
                      _this.value = value;
                      _this._isScalar = true;
                      if (!subscriber.closed) {
                          subscriber.next(value);
                          subscriber.complete();
                      }
                  }, function (err) {
                      if (!subscriber.closed) {
                          subscriber.error(err);
                      }
                  })
                      .then(null, function (err) {
                      // escape the promise trap, throw unhandled errors
                      root_1.root.setTimeout(function () { throw err; });
                  });
              }
          }
          else {
              if (this._isScalar) {
                  if (!subscriber.closed) {
                      return scheduler.schedule(dispatchNext, 0, { value: this.value, subscriber: subscriber });
                  }
              }
              else {
                  promise.then(function (value) {
                      _this.value = value;
                      _this._isScalar = true;
                      if (!subscriber.closed) {
                          subscriber.add(scheduler.schedule(dispatchNext, 0, { value: value, subscriber: subscriber }));
                      }
                  }, function (err) {
                      if (!subscriber.closed) {
                          subscriber.add(scheduler.schedule(dispatchError, 0, { err: err, subscriber: subscriber }));
                      }
                  })
                      .then(null, function (err) {
                      // escape the promise trap, throw unhandled errors
                      root_1.root.setTimeout(function () { throw err; });
                  });
              }
          }
      };
      return PromiseObservable;
  }(Observable_1.Observable));
  exports.PromiseObservable = PromiseObservable;
  function dispatchNext(arg) {
      var value = arg.value, subscriber = arg.subscriber;
      if (!subscriber.closed) {
          subscriber.next(value);
          subscriber.complete();
      }
  }
  function dispatchError(arg) {
      var err = arg.err, subscriber = arg.subscriber;
      if (!subscriber.closed) {
          subscriber.error(err);
      }
  }
  //# sourceMappingURL=PromiseObservable.js.map

/***/ },
/* 57 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var root_1 = __webpack_require__(9);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var Observable_1 = __webpack_require__(1);
  var Subscriber_1 = __webpack_require__(2);
  var map_1 = __webpack_require__(39);
  function getCORSRequest() {
      if (root_1.root.XMLHttpRequest) {
          var xhr = new root_1.root.XMLHttpRequest();
          if ('withCredentials' in xhr) {
              xhr.withCredentials = !!this.withCredentials;
          }
          return xhr;
      }
      else if (!!root_1.root.XDomainRequest) {
          return new root_1.root.XDomainRequest();
      }
      else {
          throw new Error('CORS is not supported by your browser');
      }
  }
  function getXMLHttpRequest() {
      if (root_1.root.XMLHttpRequest) {
          return new root_1.root.XMLHttpRequest();
      }
      else {
          var progId = void 0;
          try {
              var progIds = ['Msxml2.XMLHTTP', 'Microsoft.XMLHTTP', 'Msxml2.XMLHTTP.4.0'];
              for (var i = 0; i < 3; i++) {
                  try {
                      progId = progIds[i];
                      if (new root_1.root.ActiveXObject(progId)) {
                          break;
                      }
                  }
                  catch (e) {
                  }
              }
              return new root_1.root.ActiveXObject(progId);
          }
          catch (e) {
              throw new Error('XMLHttpRequest is not supported by your browser');
          }
      }
  }
  function ajaxGet(url, headers) {
      if (headers === void 0) { headers = null; }
      return new AjaxObservable({ method: 'GET', url: url, headers: headers });
  }
  exports.ajaxGet = ajaxGet;
  ;
  function ajaxPost(url, body, headers) {
      return new AjaxObservable({ method: 'POST', url: url, body: body, headers: headers });
  }
  exports.ajaxPost = ajaxPost;
  ;
  function ajaxDelete(url, headers) {
      return new AjaxObservable({ method: 'DELETE', url: url, headers: headers });
  }
  exports.ajaxDelete = ajaxDelete;
  ;
  function ajaxPut(url, body, headers) {
      return new AjaxObservable({ method: 'PUT', url: url, body: body, headers: headers });
  }
  exports.ajaxPut = ajaxPut;
  ;
  function ajaxGetJSON(url, headers) {
      return new AjaxObservable({ method: 'GET', url: url, responseType: 'json', headers: headers })
          .lift(new map_1.MapOperator(function (x, index) { return x.response; }, null));
  }
  exports.ajaxGetJSON = ajaxGetJSON;
  ;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var AjaxObservable = (function (_super) {
      __extends(AjaxObservable, _super);
      function AjaxObservable(urlOrRequest) {
          _super.call(this);
          var request = {
              async: true,
              createXHR: function () {
                  return this.crossDomain ? getCORSRequest.call(this) : getXMLHttpRequest();
              },
              crossDomain: false,
              withCredentials: false,
              headers: {},
              method: 'GET',
              responseType: 'json',
              timeout: 0
          };
          if (typeof urlOrRequest === 'string') {
              request.url = urlOrRequest;
          }
          else {
              for (var prop in urlOrRequest) {
                  if (urlOrRequest.hasOwnProperty(prop)) {
                      request[prop] = urlOrRequest[prop];
                  }
              }
          }
          this.request = request;
      }
      AjaxObservable.prototype._subscribe = function (subscriber) {
          return new AjaxSubscriber(subscriber, this.request);
      };
      /**
       * Creates an observable for an Ajax request with either a request object with
       * url, headers, etc or a string for a URL.
       *
       * @example
       * source = Rx.Observable.ajax('/products');
       * source = Rx.Observable.ajax({ url: 'products', method: 'GET' });
       *
       * @param {string|Object} request Can be one of the following:
       *   A string of the URL to make the Ajax call.
       *   An object with the following properties
       *   - url: URL of the request
       *   - body: The body of the request
       *   - method: Method of the request, such as GET, POST, PUT, PATCH, DELETE
       *   - async: Whether the request is async
       *   - headers: Optional headers
       *   - crossDomain: true if a cross domain request, else false
       *   - createXHR: a function to override if you need to use an alternate
       *   XMLHttpRequest implementation.
       *   - resultSelector: a function to use to alter the output value type of
       *   the Observable. Gets {@link AjaxResponse} as an argument.
       * @return {Observable} An observable sequence containing the XMLHttpRequest.
       * @static true
       * @name ajax
       * @owner Observable
      */
      AjaxObservable.create = (function () {
          var create = function (urlOrRequest) {
              return new AjaxObservable(urlOrRequest);
          };
          create.get = ajaxGet;
          create.post = ajaxPost;
          create.delete = ajaxDelete;
          create.put = ajaxPut;
          create.getJSON = ajaxGetJSON;
          return create;
      })();
      return AjaxObservable;
  }(Observable_1.Observable));
  exports.AjaxObservable = AjaxObservable;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var AjaxSubscriber = (function (_super) {
      __extends(AjaxSubscriber, _super);
      function AjaxSubscriber(destination, request) {
          _super.call(this, destination);
          this.request = request;
          this.done = false;
          var headers = request.headers = request.headers || {};
          // force CORS if requested
          if (!request.crossDomain && !headers['X-Requested-With']) {
              headers['X-Requested-With'] = 'XMLHttpRequest';
          }
          // ensure content type is set
          if (!('Content-Type' in headers) && !(root_1.root.FormData && request.body instanceof root_1.root.FormData) && typeof request.body !== 'undefined') {
              headers['Content-Type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
          }
          // properly serialize body
          request.body = this.serializeBody(request.body, request.headers['Content-Type']);
          this.send();
      }
      AjaxSubscriber.prototype.next = function (e) {
          this.done = true;
          var _a = this, xhr = _a.xhr, request = _a.request, destination = _a.destination;
          var response = new AjaxResponse(e, xhr, request);
          destination.next(response);
      };
      AjaxSubscriber.prototype.send = function () {
          var _a = this, request = _a.request, _b = _a.request, user = _b.user, method = _b.method, url = _b.url, async = _b.async, password = _b.password, headers = _b.headers, body = _b.body;
          var createXHR = request.createXHR;
          var xhr = tryCatch_1.tryCatch(createXHR).call(request);
          if (xhr === errorObject_1.errorObject) {
              this.error(errorObject_1.errorObject.e);
          }
          else {
              this.xhr = xhr;
              // open XHR first
              var result = void 0;
              if (user) {
                  result = tryCatch_1.tryCatch(xhr.open).call(xhr, method, url, async, user, password);
              }
              else {
                  result = tryCatch_1.tryCatch(xhr.open).call(xhr, method, url, async);
              }
              if (result === errorObject_1.errorObject) {
                  this.error(errorObject_1.errorObject.e);
                  return null;
              }
              // timeout and responseType can be set once the XHR is open
              xhr.timeout = request.timeout;
              xhr.responseType = request.responseType;
              // set headers
              this.setHeaders(xhr, headers);
              // now set up the events
              this.setupEvents(xhr, request);
              // finally send the request
              if (body) {
                  xhr.send(body);
              }
              else {
                  xhr.send();
              }
          }
          return xhr;
      };
      AjaxSubscriber.prototype.serializeBody = function (body, contentType) {
          if (!body || typeof body === 'string') {
              return body;
          }
          else if (root_1.root.FormData && body instanceof root_1.root.FormData) {
              return body;
          }
          if (contentType) {
              var splitIndex = contentType.indexOf(';');
              if (splitIndex !== -1) {
                  contentType = contentType.substring(0, splitIndex);
              }
          }
          switch (contentType) {
              case 'application/x-www-form-urlencoded':
                  return Object.keys(body).map(function (key) { return (encodeURI(key) + "=" + encodeURI(body[key])); }).join('&');
              case 'application/json':
                  return JSON.stringify(body);
              default:
                  return body;
          }
      };
      AjaxSubscriber.prototype.setHeaders = function (xhr, headers) {
          for (var key in headers) {
              if (headers.hasOwnProperty(key)) {
                  xhr.setRequestHeader(key, headers[key]);
              }
          }
      };
      AjaxSubscriber.prototype.setupEvents = function (xhr, request) {
          var progressSubscriber = request.progressSubscriber;
          xhr.ontimeout = function xhrTimeout(e) {
              var _a = xhrTimeout, subscriber = _a.subscriber, progressSubscriber = _a.progressSubscriber, request = _a.request;
              if (progressSubscriber) {
                  progressSubscriber.error(e);
              }
              subscriber.error(new AjaxTimeoutError(this, request)); //TODO: Make betterer.
          };
          xhr.ontimeout.request = request;
          xhr.ontimeout.subscriber = this;
          xhr.ontimeout.progressSubscriber = progressSubscriber;
          if (xhr.upload && 'withCredentials' in xhr && root_1.root.XDomainRequest) {
              if (progressSubscriber) {
                  xhr.onprogress = function xhrProgress(e) {
                      var progressSubscriber = xhrProgress.progressSubscriber;
                      progressSubscriber.next(e);
                  };
                  xhr.onprogress.progressSubscriber = progressSubscriber;
              }
              xhr.onerror = function xhrError(e) {
                  var _a = xhrError, progressSubscriber = _a.progressSubscriber, subscriber = _a.subscriber, request = _a.request;
                  if (progressSubscriber) {
                      progressSubscriber.error(e);
                  }
                  subscriber.error(new AjaxError('ajax error', this, request));
              };
              xhr.onerror.request = request;
              xhr.onerror.subscriber = this;
              xhr.onerror.progressSubscriber = progressSubscriber;
          }
          xhr.onreadystatechange = function xhrReadyStateChange(e) {
              var _a = xhrReadyStateChange, subscriber = _a.subscriber, progressSubscriber = _a.progressSubscriber, request = _a.request;
              if (this.readyState === 4) {
                  // normalize IE9 bug (http://bugs.jquery.com/ticket/1450)
                  var status_1 = this.status === 1223 ? 204 : this.status;
                  var response = (this.responseType === 'text' ? (this.response || this.responseText) : this.response);
                  // fix status code when it is 0 (0 status is undocumented).
                  // Occurs when accessing file resources or on Android 4.1 stock browser
                  // while retrieving files from application cache.
                  if (status_1 === 0) {
                      status_1 = response ? 200 : 0;
                  }
                  if (200 <= status_1 && status_1 < 300) {
                      if (progressSubscriber) {
                          progressSubscriber.complete();
                      }
                      subscriber.next(e);
                      subscriber.complete();
                  }
                  else {
                      if (progressSubscriber) {
                          progressSubscriber.error(e);
                      }
                      subscriber.error(new AjaxError('ajax error ' + status_1, this, request));
                  }
              }
          };
          xhr.onreadystatechange.subscriber = this;
          xhr.onreadystatechange.progressSubscriber = progressSubscriber;
          xhr.onreadystatechange.request = request;
      };
      AjaxSubscriber.prototype.unsubscribe = function () {
          var _a = this, done = _a.done, xhr = _a.xhr;
          if (!done && xhr && xhr.readyState !== 4 && typeof xhr.abort === 'function') {
              xhr.abort();
          }
          _super.prototype.unsubscribe.call(this);
      };
      return AjaxSubscriber;
  }(Subscriber_1.Subscriber));
  exports.AjaxSubscriber = AjaxSubscriber;
  /**
   * A normalized AJAX response.
   *
   * @see {@link ajax}
   *
   * @class AjaxResponse
   */
  var AjaxResponse = (function () {
      function AjaxResponse(originalEvent, xhr, request) {
          this.originalEvent = originalEvent;
          this.xhr = xhr;
          this.request = request;
          this.status = xhr.status;
          this.responseType = xhr.responseType || request.responseType;
          switch (this.responseType) {
              case 'json':
                  if ('response' in xhr) {
                      //IE does not support json as responseType, parse it internally
                      this.response = xhr.responseType ? xhr.response : JSON.parse(xhr.response || xhr.responseText || 'null');
                  }
                  else {
                      this.response = JSON.parse(xhr.responseText || 'null');
                  }
                  break;
              case 'xml':
                  this.response = xhr.responseXML;
                  break;
              case 'text':
              default:
                  this.response = ('response' in xhr) ? xhr.response : xhr.responseText;
                  break;
          }
      }
      return AjaxResponse;
  }());
  exports.AjaxResponse = AjaxResponse;
  /**
   * A normalized AJAX error.
   *
   * @see {@link ajax}
   *
   * @class AjaxError
   */
  var AjaxError = (function (_super) {
      __extends(AjaxError, _super);
      function AjaxError(message, xhr, request) {
          _super.call(this, message);
          this.message = message;
          this.xhr = xhr;
          this.request = request;
          this.status = xhr.status;
      }
      return AjaxError;
  }(Error));
  exports.AjaxError = AjaxError;
  /**
   * @see {@link ajax}
   *
   * @class AjaxTimeoutError
   */
  var AjaxTimeoutError = (function (_super) {
      __extends(AjaxTimeoutError, _super);
      function AjaxTimeoutError(xhr, request) {
          _super.call(this, 'ajax timeout', xhr, request);
      }
      return AjaxTimeoutError;
  }(AjaxError));
  exports.AjaxTimeoutError = AjaxTimeoutError;
  //# sourceMappingURL=AjaxObservable.js.map

/***/ },
/* 58 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Returns an Observable that emits all items emitted by the source Observable that are distinct by comparison from previous items.
   * If a comparator function is provided, then it will be called for each item to test for whether or not that value should be emitted.
   * If a comparator function is not provided, an equality check is used by default.
   * As the internal HashSet of this operator grows larger and larger, care should be taken in the domain of inputs this operator may see.
   * An optional parameter is also provided such that an Observable can be provided to queue the internal HashSet to flush the values it holds.
   * @param {function} [compare] optional comparison function called to test if an item is distinct from previous items in the source.
   * @param {Observable} [flushes] optional Observable for flushing the internal HashSet of the operator.
   * @return {Observable} an Observable that emits items from the source Observable with distinct values.
   * @method distinct
   * @owner Observable
   */
  function distinct(compare, flushes) {
      return this.lift(new DistinctOperator(compare, flushes));
  }
  exports.distinct = distinct;
  var DistinctOperator = (function () {
      function DistinctOperator(compare, flushes) {
          this.compare = compare;
          this.flushes = flushes;
      }
      DistinctOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DistinctSubscriber(subscriber, this.compare, this.flushes));
      };
      return DistinctOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DistinctSubscriber = (function (_super) {
      __extends(DistinctSubscriber, _super);
      function DistinctSubscriber(destination, compare, flushes) {
          _super.call(this, destination);
          this.values = [];
          if (typeof compare === 'function') {
              this.compare = compare;
          }
          if (flushes) {
              this.add(subscribeToResult_1.subscribeToResult(this, flushes));
          }
      }
      DistinctSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.values.length = 0;
      };
      DistinctSubscriber.prototype.notifyError = function (error, innerSub) {
          this._error(error);
      };
      DistinctSubscriber.prototype._next = function (value) {
          var found = false;
          var values = this.values;
          var len = values.length;
          try {
              for (var i = 0; i < len; i++) {
                  if (this.compare(values[i], value)) {
                      found = true;
                      return;
                  }
              }
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.values.push(value);
          this.destination.next(value);
      };
      DistinctSubscriber.prototype.compare = function (x, y) {
          return x === y;
      };
      return DistinctSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.DistinctSubscriber = DistinctSubscriber;
  //# sourceMappingURL=distinct.js.map

/***/ },
/* 59 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  /* tslint:disable:max-line-length */
  function distinctUntilChanged(compare, keySelector) {
      return this.lift(new DistinctUntilChangedOperator(compare, keySelector));
  }
  exports.distinctUntilChanged = distinctUntilChanged;
  var DistinctUntilChangedOperator = (function () {
      function DistinctUntilChangedOperator(compare, keySelector) {
          this.compare = compare;
          this.keySelector = keySelector;
      }
      DistinctUntilChangedOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DistinctUntilChangedSubscriber(subscriber, this.compare, this.keySelector));
      };
      return DistinctUntilChangedOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DistinctUntilChangedSubscriber = (function (_super) {
      __extends(DistinctUntilChangedSubscriber, _super);
      function DistinctUntilChangedSubscriber(destination, compare, keySelector) {
          _super.call(this, destination);
          this.keySelector = keySelector;
          this.hasKey = false;
          if (typeof compare === 'function') {
              this.compare = compare;
          }
      }
      DistinctUntilChangedSubscriber.prototype.compare = function (x, y) {
          return x === y;
      };
      DistinctUntilChangedSubscriber.prototype._next = function (value) {
          var keySelector = this.keySelector;
          var key = value;
          if (keySelector) {
              key = tryCatch_1.tryCatch(this.keySelector)(value);
              if (key === errorObject_1.errorObject) {
                  return this.destination.error(errorObject_1.errorObject.e);
              }
          }
          var result = false;
          if (this.hasKey) {
              result = tryCatch_1.tryCatch(this.compare)(this.key, key);
              if (result === errorObject_1.errorObject) {
                  return this.destination.error(errorObject_1.errorObject.e);
              }
          }
          else {
              this.hasKey = true;
          }
          if (Boolean(result) === false) {
              this.key = key;
              this.destination.next(value);
          }
      };
      return DistinctUntilChangedSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=distinctUntilChanged.js.map

/***/ },
/* 60 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /* tslint:disable:max-line-length */
  function filter(predicate, thisArg) {
      return this.lift(new FilterOperator(predicate, thisArg));
  }
  exports.filter = filter;
  var FilterOperator = (function () {
      function FilterOperator(predicate, thisArg) {
          this.predicate = predicate;
          this.thisArg = thisArg;
      }
      FilterOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new FilterSubscriber(subscriber, this.predicate, this.thisArg));
      };
      return FilterOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var FilterSubscriber = (function (_super) {
      __extends(FilterSubscriber, _super);
      function FilterSubscriber(destination, predicate, thisArg) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.thisArg = thisArg;
          this.count = 0;
          this.predicate = predicate;
      }
      // the try catch block below is left specifically for
      // optimization and perf reasons. a tryCatcher is not necessary here.
      FilterSubscriber.prototype._next = function (value) {
          var result;
          try {
              result = this.predicate.call(this.thisArg, value, this.count++);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          if (result) {
              this.destination.next(value);
          }
      };
      return FilterSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=filter.js.map

/***/ },
/* 61 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /* tslint:disable:max-line-length */
  function find(predicate, thisArg) {
      if (typeof predicate !== 'function') {
          throw new TypeError('predicate is not a function');
      }
      return this.lift(new FindValueOperator(predicate, this, false, thisArg));
  }
  exports.find = find;
  var FindValueOperator = (function () {
      function FindValueOperator(predicate, source, yieldIndex, thisArg) {
          this.predicate = predicate;
          this.source = source;
          this.yieldIndex = yieldIndex;
          this.thisArg = thisArg;
      }
      FindValueOperator.prototype.call = function (observer, source) {
          return source._subscribe(new FindValueSubscriber(observer, this.predicate, this.source, this.yieldIndex, this.thisArg));
      };
      return FindValueOperator;
  }());
  exports.FindValueOperator = FindValueOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var FindValueSubscriber = (function (_super) {
      __extends(FindValueSubscriber, _super);
      function FindValueSubscriber(destination, predicate, source, yieldIndex, thisArg) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.source = source;
          this.yieldIndex = yieldIndex;
          this.thisArg = thisArg;
          this.index = 0;
      }
      FindValueSubscriber.prototype.notifyComplete = function (value) {
          var destination = this.destination;
          destination.next(value);
          destination.complete();
      };
      FindValueSubscriber.prototype._next = function (value) {
          var _a = this, predicate = _a.predicate, thisArg = _a.thisArg;
          var index = this.index++;
          try {
              var result = predicate.call(thisArg || this, value, index, this.source);
              if (result) {
                  this.notifyComplete(this.yieldIndex ? index : value);
              }
          }
          catch (err) {
              this.destination.error(err);
          }
      };
      FindValueSubscriber.prototype._complete = function () {
          this.notifyComplete(this.yieldIndex ? -1 : undefined);
      };
      return FindValueSubscriber;
  }(Subscriber_1.Subscriber));
  exports.FindValueSubscriber = FindValueSubscriber;
  //# sourceMappingURL=find.js.map

/***/ },
/* 62 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ArrayObservable_1 = __webpack_require__(12);
  var mergeAll_1 = __webpack_require__(26);
  var isScheduler_1 = __webpack_require__(15);
  /* tslint:disable:max-line-length */
  function merge() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      return this.lift.call(mergeStatic.apply(void 0, [this].concat(observables)));
  }
  exports.merge = merge;
  /* tslint:enable:max-line-length */
  /**
   * Creates an output Observable which concurrently emits all values from every
   * given input Observable.
   *
   * <span class="informal">Flattens multiple Observables together by blending
   * their values into one Observable.</span>
   *
   * <img src="./img/merge.png" width="100%">
   *
   * `merge` subscribes to each given input Observable (as arguments), and simply
   * forwards (without doing any transformation) all the values from all the input
   * Observables to the output Observable. The output Observable only completes
   * once all input Observables have completed. Any error delivered by an input
   * Observable will be immediately emitted on the output Observable.
   *
   * @example <caption>Merge together two Observables: 1s interval and clicks</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var timer = Rx.Observable.interval(1000);
   * var clicksOrTimer = Rx.Observable.merge(clicks, timer);
   * clicksOrTimer.subscribe(x => console.log(x));
   *
   * @example <caption>Merge together 3 Observables, but only 2 run concurrently</caption>
   * var timer1 = Rx.Observable.interval(1000).take(10);
   * var timer2 = Rx.Observable.interval(2000).take(6);
   * var timer3 = Rx.Observable.interval(500).take(10);
   * var concurrent = 2; // the argument
   * var merged = Rx.Observable.merge(timer1, timer2, timer3, concurrent);
   * merged.subscribe(x => console.log(x));
   *
   * @see {@link mergeAll}
   * @see {@link mergeMap}
   * @see {@link mergeMapTo}
   * @see {@link mergeScan}
   *
   * @param {...Observable} observables Input Observables to merge together.
   * @param {number} [concurrent=Number.POSITIVE_INFINITY] Maximum number of input
   * Observables being subscribed to concurrently.
   * @param {Scheduler} [scheduler=null] The Scheduler to use for managing
   * concurrency of input Observables.
   * @return {Observable} an Observable that emits items that are the result of
   * every input Observable.
   * @static true
   * @name merge
   * @owner Observable
   */
  function mergeStatic() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      var concurrent = Number.POSITIVE_INFINITY;
      var scheduler = null;
      var last = observables[observables.length - 1];
      if (isScheduler_1.isScheduler(last)) {
          scheduler = observables.pop();
          if (observables.length > 1 && typeof observables[observables.length - 1] === 'number') {
              concurrent = observables.pop();
          }
      }
      else if (typeof last === 'number') {
          concurrent = observables.pop();
      }
      if (scheduler === null && observables.length === 1) {
          return observables[0];
      }
      return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new mergeAll_1.MergeAllOperator(concurrent));
  }
  exports.mergeStatic = mergeStatic;
  //# sourceMappingURL=merge.js.map

/***/ },
/* 63 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /* tslint:disable:max-line-length */
  function mergeMap(project, resultSelector, concurrent) {
      if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
      if (typeof resultSelector === 'number') {
          concurrent = resultSelector;
          resultSelector = null;
      }
      return this.lift(new MergeMapOperator(project, resultSelector, concurrent));
  }
  exports.mergeMap = mergeMap;
  var MergeMapOperator = (function () {
      function MergeMapOperator(project, resultSelector, concurrent) {
          if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
          this.project = project;
          this.resultSelector = resultSelector;
          this.concurrent = concurrent;
      }
      MergeMapOperator.prototype.call = function (observer, source) {
          return source._subscribe(new MergeMapSubscriber(observer, this.project, this.resultSelector, this.concurrent));
      };
      return MergeMapOperator;
  }());
  exports.MergeMapOperator = MergeMapOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MergeMapSubscriber = (function (_super) {
      __extends(MergeMapSubscriber, _super);
      function MergeMapSubscriber(destination, project, resultSelector, concurrent) {
          if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
          _super.call(this, destination);
          this.project = project;
          this.resultSelector = resultSelector;
          this.concurrent = concurrent;
          this.hasCompleted = false;
          this.buffer = [];
          this.active = 0;
          this.index = 0;
      }
      MergeMapSubscriber.prototype._next = function (value) {
          if (this.active < this.concurrent) {
              this._tryNext(value);
          }
          else {
              this.buffer.push(value);
          }
      };
      MergeMapSubscriber.prototype._tryNext = function (value) {
          var result;
          var index = this.index++;
          try {
              result = this.project(value, index);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.active++;
          this._innerSub(result, value, index);
      };
      MergeMapSubscriber.prototype._innerSub = function (ish, value, index) {
          this.add(subscribeToResult_1.subscribeToResult(this, ish, value, index));
      };
      MergeMapSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (this.active === 0 && this.buffer.length === 0) {
              this.destination.complete();
          }
      };
      MergeMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          if (this.resultSelector) {
              this._notifyResultSelector(outerValue, innerValue, outerIndex, innerIndex);
          }
          else {
              this.destination.next(innerValue);
          }
      };
      MergeMapSubscriber.prototype._notifyResultSelector = function (outerValue, innerValue, outerIndex, innerIndex) {
          var result;
          try {
              result = this.resultSelector(outerValue, innerValue, outerIndex, innerIndex);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.destination.next(result);
      };
      MergeMapSubscriber.prototype.notifyComplete = function (innerSub) {
          var buffer = this.buffer;
          this.remove(innerSub);
          this.active--;
          if (buffer.length > 0) {
              this._next(buffer.shift());
          }
          else if (this.active === 0 && this.hasCompleted) {
              this.destination.complete();
          }
      };
      return MergeMapSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.MergeMapSubscriber = MergeMapSubscriber;
  //# sourceMappingURL=mergeMap.js.map

/***/ },
/* 64 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function mergeMapTo(innerObservable, resultSelector, concurrent) {
      if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
      if (typeof resultSelector === 'number') {
          concurrent = resultSelector;
          resultSelector = null;
      }
      return this.lift(new MergeMapToOperator(innerObservable, resultSelector, concurrent));
  }
  exports.mergeMapTo = mergeMapTo;
  // TODO: Figure out correct signature here: an Operator<Observable<T>, R>
  //       needs to implement call(observer: Subscriber<R>): Subscriber<Observable<T>>
  var MergeMapToOperator = (function () {
      function MergeMapToOperator(ish, resultSelector, concurrent) {
          if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
          this.ish = ish;
          this.resultSelector = resultSelector;
          this.concurrent = concurrent;
      }
      MergeMapToOperator.prototype.call = function (observer, source) {
          return source._subscribe(new MergeMapToSubscriber(observer, this.ish, this.resultSelector, this.concurrent));
      };
      return MergeMapToOperator;
  }());
  exports.MergeMapToOperator = MergeMapToOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MergeMapToSubscriber = (function (_super) {
      __extends(MergeMapToSubscriber, _super);
      function MergeMapToSubscriber(destination, ish, resultSelector, concurrent) {
          if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
          _super.call(this, destination);
          this.ish = ish;
          this.resultSelector = resultSelector;
          this.concurrent = concurrent;
          this.hasCompleted = false;
          this.buffer = [];
          this.active = 0;
          this.index = 0;
      }
      MergeMapToSubscriber.prototype._next = function (value) {
          if (this.active < this.concurrent) {
              var resultSelector = this.resultSelector;
              var index = this.index++;
              var ish = this.ish;
              var destination = this.destination;
              this.active++;
              this._innerSub(ish, destination, resultSelector, value, index);
          }
          else {
              this.buffer.push(value);
          }
      };
      MergeMapToSubscriber.prototype._innerSub = function (ish, destination, resultSelector, value, index) {
          this.add(subscribeToResult_1.subscribeToResult(this, ish, value, index));
      };
      MergeMapToSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (this.active === 0 && this.buffer.length === 0) {
              this.destination.complete();
          }
      };
      MergeMapToSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var _a = this, resultSelector = _a.resultSelector, destination = _a.destination;
          if (resultSelector) {
              this.trySelectResult(outerValue, innerValue, outerIndex, innerIndex);
          }
          else {
              destination.next(innerValue);
          }
      };
      MergeMapToSubscriber.prototype.trySelectResult = function (outerValue, innerValue, outerIndex, innerIndex) {
          var _a = this, resultSelector = _a.resultSelector, destination = _a.destination;
          var result;
          try {
              result = resultSelector(outerValue, innerValue, outerIndex, innerIndex);
          }
          catch (err) {
              destination.error(err);
              return;
          }
          destination.next(result);
      };
      MergeMapToSubscriber.prototype.notifyError = function (err) {
          this.destination.error(err);
      };
      MergeMapToSubscriber.prototype.notifyComplete = function (innerSub) {
          var buffer = this.buffer;
          this.remove(innerSub);
          this.active--;
          if (buffer.length > 0) {
              this._next(buffer.shift());
          }
          else if (this.active === 0 && this.hasCompleted) {
              this.destination.complete();
          }
      };
      return MergeMapToSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.MergeMapToSubscriber = MergeMapToSubscriber;
  //# sourceMappingURL=mergeMapTo.js.map

/***/ },
/* 65 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var FromObservable_1 = __webpack_require__(55);
  var isArray_1 = __webpack_require__(11);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function onErrorResumeNext() {
      var nextSources = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          nextSources[_i - 0] = arguments[_i];
      }
      if (nextSources.length === 1 && isArray_1.isArray(nextSources[0])) {
          nextSources = nextSources[0];
      }
      return this.lift(new OnErrorResumeNextOperator(nextSources));
  }
  exports.onErrorResumeNext = onErrorResumeNext;
  /* tslint:enable:max-line-length */
  function onErrorResumeNextStatic() {
      var nextSources = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          nextSources[_i - 0] = arguments[_i];
      }
      var source = null;
      if (nextSources.length === 1 && isArray_1.isArray(nextSources[0])) {
          nextSources = nextSources[0];
      }
      source = nextSources.shift();
      return new FromObservable_1.FromObservable(source, null).lift(new OnErrorResumeNextOperator(nextSources));
  }
  exports.onErrorResumeNextStatic = onErrorResumeNextStatic;
  var OnErrorResumeNextOperator = (function () {
      function OnErrorResumeNextOperator(nextSources) {
          this.nextSources = nextSources;
      }
      OnErrorResumeNextOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new OnErrorResumeNextSubscriber(subscriber, this.nextSources));
      };
      return OnErrorResumeNextOperator;
  }());
  var OnErrorResumeNextSubscriber = (function (_super) {
      __extends(OnErrorResumeNextSubscriber, _super);
      function OnErrorResumeNextSubscriber(destination, nextSources) {
          _super.call(this, destination);
          this.destination = destination;
          this.nextSources = nextSources;
      }
      OnErrorResumeNextSubscriber.prototype.notifyError = function (error, innerSub) {
          this.subscribeToNextSource();
      };
      OnErrorResumeNextSubscriber.prototype.notifyComplete = function (innerSub) {
          this.subscribeToNextSource();
      };
      OnErrorResumeNextSubscriber.prototype._error = function (err) {
          this.subscribeToNextSource();
      };
      OnErrorResumeNextSubscriber.prototype._complete = function () {
          this.subscribeToNextSource();
      };
      OnErrorResumeNextSubscriber.prototype.subscribeToNextSource = function () {
          var next = this.nextSources.shift();
          if (next) {
              this.add(subscribeToResult_1.subscribeToResult(this, next));
          }
          else {
              this.destination.complete();
          }
      };
      return OnErrorResumeNextSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=onErrorResumeNext.js.map

/***/ },
/* 66 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var isArray_1 = __webpack_require__(11);
  var ArrayObservable_1 = __webpack_require__(12);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function race() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      // if the only argument is an array, it was most likely called with
      // `pair([obs1, obs2, ...])`
      if (observables.length === 1 && isArray_1.isArray(observables[0])) {
          observables = observables[0];
      }
      return this.lift.call(raceStatic.apply(void 0, [this].concat(observables)));
  }
  exports.race = race;
  function raceStatic() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      // if the only argument is an array, it was most likely called with
      // `pair([obs1, obs2, ...])`
      if (observables.length === 1) {
          if (isArray_1.isArray(observables[0])) {
              observables = observables[0];
          }
          else {
              return observables[0];
          }
      }
      return new ArrayObservable_1.ArrayObservable(observables).lift(new RaceOperator());
  }
  exports.raceStatic = raceStatic;
  var RaceOperator = (function () {
      function RaceOperator() {
      }
      RaceOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new RaceSubscriber(subscriber));
      };
      return RaceOperator;
  }());
  exports.RaceOperator = RaceOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var RaceSubscriber = (function (_super) {
      __extends(RaceSubscriber, _super);
      function RaceSubscriber(destination) {
          _super.call(this, destination);
          this.hasFirst = false;
          this.observables = [];
          this.subscriptions = [];
      }
      RaceSubscriber.prototype._next = function (observable) {
          this.observables.push(observable);
      };
      RaceSubscriber.prototype._complete = function () {
          var observables = this.observables;
          var len = observables.length;
          if (len === 0) {
              this.destination.complete();
          }
          else {
              for (var i = 0; i < len; i++) {
                  var observable = observables[i];
                  var subscription = subscribeToResult_1.subscribeToResult(this, observable, observable, i);
                  if (this.subscriptions) {
                      this.subscriptions.push(subscription);
                      this.add(subscription);
                  }
              }
              this.observables = null;
          }
      };
      RaceSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          if (!this.hasFirst) {
              this.hasFirst = true;
              for (var i = 0; i < this.subscriptions.length; i++) {
                  if (i !== outerIndex) {
                      var subscription = this.subscriptions[i];
                      subscription.unsubscribe();
                      this.remove(subscription);
                  }
              }
              this.subscriptions = null;
          }
          this.destination.next(innerValue);
      };
      return RaceSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.RaceSubscriber = RaceSubscriber;
  //# sourceMappingURL=race.js.map

/***/ },
/* 67 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var async_1 = __webpack_require__(10);
  /**
   * @param scheduler
   * @return {Observable<TimeInterval<any>>|WebSocketSubject<T>|Observable<T>}
   * @method timeInterval
   * @owner Observable
   */
  function timeInterval(scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new TimeIntervalOperator(scheduler));
  }
  exports.timeInterval = timeInterval;
  var TimeInterval = (function () {
      function TimeInterval(value, interval) {
          this.value = value;
          this.interval = interval;
      }
      return TimeInterval;
  }());
  exports.TimeInterval = TimeInterval;
  ;
  var TimeIntervalOperator = (function () {
      function TimeIntervalOperator(scheduler) {
          this.scheduler = scheduler;
      }
      TimeIntervalOperator.prototype.call = function (observer, source) {
          return source._subscribe(new TimeIntervalSubscriber(observer, this.scheduler));
      };
      return TimeIntervalOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TimeIntervalSubscriber = (function (_super) {
      __extends(TimeIntervalSubscriber, _super);
      function TimeIntervalSubscriber(destination, scheduler) {
          _super.call(this, destination);
          this.scheduler = scheduler;
          this.lastTime = 0;
          this.lastTime = scheduler.now();
      }
      TimeIntervalSubscriber.prototype._next = function (value) {
          var now = this.scheduler.now();
          var span = now - this.lastTime;
          this.lastTime = now;
          this.destination.next(new TimeInterval(value, span));
      };
      return TimeIntervalSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=timeInterval.js.map

/***/ },
/* 68 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var async_1 = __webpack_require__(10);
  /**
   * @param scheduler
   * @return {Observable<Timestamp<any>>|WebSocketSubject<T>|Observable<T>}
   * @method timestamp
   * @owner Observable
   */
  function timestamp(scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new TimestampOperator(scheduler));
  }
  exports.timestamp = timestamp;
  var Timestamp = (function () {
      function Timestamp(value, timestamp) {
          this.value = value;
          this.timestamp = timestamp;
      }
      return Timestamp;
  }());
  exports.Timestamp = Timestamp;
  ;
  var TimestampOperator = (function () {
      function TimestampOperator(scheduler) {
          this.scheduler = scheduler;
      }
      TimestampOperator.prototype.call = function (observer, source) {
          return source._subscribe(new TimestampSubscriber(observer, this.scheduler));
      };
      return TimestampOperator;
  }());
  var TimestampSubscriber = (function (_super) {
      __extends(TimestampSubscriber, _super);
      function TimestampSubscriber(destination, scheduler) {
          _super.call(this, destination);
          this.scheduler = scheduler;
      }
      TimestampSubscriber.prototype._next = function (value) {
          var now = this.scheduler.now();
          this.destination.next(new Timestamp(value, now));
      };
      return TimestampSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=timestamp.js.map

/***/ },
/* 69 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var AsyncAction_1 = __webpack_require__(21);
  var AsyncScheduler_1 = __webpack_require__(22);
  var VirtualTimeScheduler = (function (_super) {
      __extends(VirtualTimeScheduler, _super);
      function VirtualTimeScheduler(SchedulerAction, maxFrames) {
          var _this = this;
          if (SchedulerAction === void 0) { SchedulerAction = VirtualAction; }
          if (maxFrames === void 0) { maxFrames = Number.POSITIVE_INFINITY; }
          _super.call(this, SchedulerAction, function () { return _this.frame; });
          this.maxFrames = maxFrames;
          this.frame = 0;
          this.index = -1;
      }
      /**
       * Prompt the Scheduler to execute all of its queued actions, therefore
       * clearing its queue.
       * @return {void}
       */
      VirtualTimeScheduler.prototype.flush = function () {
          var _a = this, actions = _a.actions, maxFrames = _a.maxFrames;
          var error, action;
          while ((action = actions.shift()) && (this.frame = action.delay) <= maxFrames) {
              if (error = action.execute(action.state, action.delay)) {
                  break;
              }
          }
          if (error) {
              while (action = actions.shift()) {
                  action.unsubscribe();
              }
              throw error;
          }
      };
      VirtualTimeScheduler.frameTimeFactor = 10;
      return VirtualTimeScheduler;
  }(AsyncScheduler_1.AsyncScheduler));
  exports.VirtualTimeScheduler = VirtualTimeScheduler;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var VirtualAction = (function (_super) {
      __extends(VirtualAction, _super);
      function VirtualAction(scheduler, work, index) {
          if (index === void 0) { index = scheduler.index += 1; }
          _super.call(this, scheduler, work);
          this.scheduler = scheduler;
          this.work = work;
          this.index = index;
          this.index = scheduler.index = index;
      }
      VirtualAction.prototype.schedule = function (state, delay) {
          if (delay === void 0) { delay = 0; }
          return !this.id ?
              _super.prototype.schedule.call(this, state, delay) : this.add(new VirtualAction(this.scheduler, this.work)).schedule(state, delay);
      };
      VirtualAction.prototype.requestAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          this.delay = scheduler.frame + delay;
          var actions = scheduler.actions;
          actions.push(this);
          actions.sort(VirtualAction.sortActions);
          return true;
      };
      VirtualAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          return undefined;
      };
      VirtualAction.sortActions = function (a, b) {
          if (a.delay === b.delay) {
              if (a.index === b.index) {
                  return 0;
              }
              else if (a.index > b.index) {
                  return 1;
              }
              else {
                  return -1;
              }
          }
          else if (a.delay > b.delay) {
              return 1;
          }
          else {
              return -1;
          }
      };
      return VirtualAction;
  }(AsyncAction_1.AsyncAction));
  exports.VirtualAction = VirtualAction;
  //# sourceMappingURL=VirtualTimeScheduler.js.map

/***/ },
/* 70 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var AsapAction_1 = __webpack_require__(363);
  var AsapScheduler_1 = __webpack_require__(364);
  exports.asap = new AsapScheduler_1.AsapScheduler(AsapAction_1.AsapAction);
  //# sourceMappingURL=asap.js.map

/***/ },
/* 71 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var QueueAction_1 = __webpack_require__(365);
  var QueueScheduler_1 = __webpack_require__(366);
  exports.queue = new QueueScheduler_1.QueueScheduler(QueueAction_1.QueueAction);
  //# sourceMappingURL=queue.js.map

/***/ },
/* 72 */
/***/ function(module, exports) {

  "use strict";
  var SubscriptionLog = (function () {
      function SubscriptionLog(subscribedFrame, unsubscribedFrame) {
          if (unsubscribedFrame === void 0) { unsubscribedFrame = Number.POSITIVE_INFINITY; }
          this.subscribedFrame = subscribedFrame;
          this.unsubscribedFrame = unsubscribedFrame;
      }
      return SubscriptionLog;
  }());
  exports.SubscriptionLog = SubscriptionLog;
  //# sourceMappingURL=SubscriptionLog.js.map

/***/ },
/* 73 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var SubscriptionLog_1 = __webpack_require__(72);
  var SubscriptionLoggable = (function () {
      function SubscriptionLoggable() {
          this.subscriptions = [];
      }
      SubscriptionLoggable.prototype.logSubscribedFrame = function () {
          this.subscriptions.push(new SubscriptionLog_1.SubscriptionLog(this.scheduler.now()));
          return this.subscriptions.length - 1;
      };
      SubscriptionLoggable.prototype.logUnsubscribedFrame = function (index) {
          var subscriptionLogs = this.subscriptions;
          var oldSubscriptionLog = subscriptionLogs[index];
          subscriptionLogs[index] = new SubscriptionLog_1.SubscriptionLog(oldSubscriptionLog.subscribedFrame, this.scheduler.now());
      };
      return SubscriptionLoggable;
  }());
  exports.SubscriptionLoggable = SubscriptionLoggable;
  //# sourceMappingURL=SubscriptionLoggable.js.map

/***/ },
/* 74 */
/***/ function(module, exports) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  /**
   * An error thrown when duetime elapses.
   *
   * @see {@link timeout}
   *
   * @class TimeoutError
   */
  var TimeoutError = (function (_super) {
      __extends(TimeoutError, _super);
      function TimeoutError() {
          var err = _super.call(this, 'Timeout has occurred');
          this.name = err.name = 'TimeoutError';
          this.stack = err.stack;
          this.message = err.message;
      }
      return TimeoutError;
  }(Error));
  exports.TimeoutError = TimeoutError;
  //# sourceMappingURL=TimeoutError.js.map

/***/ },
/* 75 */
/***/ function(module, exports) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  /**
   * An error thrown when one or more errors have occurred during the
   * `unsubscribe` of a {@link Subscription}.
   */
  var UnsubscriptionError = (function (_super) {
      __extends(UnsubscriptionError, _super);
      function UnsubscriptionError(errors) {
          _super.call(this);
          this.errors = errors;
          var err = Error.call(this, errors ?
              errors.length + " errors occurred during unsubscription:\n  " + errors.map(function (err, i) { return ((i + 1) + ") " + err.toString()); }).join('\n  ') : '');
          this.name = err.name = 'UnsubscriptionError';
          this.stack = err.stack;
          this.message = err.message;
      }
      return UnsubscriptionError;
  }(Error));
  exports.UnsubscriptionError = UnsubscriptionError;
  //# sourceMappingURL=UnsubscriptionError.js.map

/***/ },
/* 76 */
/***/ function(module, exports) {

  "use strict";
  function applyMixins(derivedCtor, baseCtors) {
      for (var i = 0, len = baseCtors.length; i < len; i++) {
          var baseCtor = baseCtors[i];
          var propertyKeys = Object.getOwnPropertyNames(baseCtor.prototype);
          for (var j = 0, len2 = propertyKeys.length; j < len2; j++) {
              var name_1 = propertyKeys[j];
              derivedCtor.prototype[name_1] = baseCtor.prototype[name_1];
          }
      }
  }
  exports.applyMixins = applyMixins;
  //# sourceMappingURL=applyMixins.js.map

/***/ },
/* 77 */
/***/ function(module, exports) {

  "use strict";
  function isPromise(value) {
      return value && typeof value.subscribe !== 'function' && typeof value.then === 'function';
  }
  exports.isPromise = isPromise;
  //# sourceMappingURL=isPromise.js.map

/***/ },
/* 78 */
/***/ function(module, exports) {

  "use strict";
  /* tslint:disable:no-empty */
  function noop() { }
  exports.noop = noop;
  //# sourceMappingURL=noop.js.map

/***/ },
/* 79 */
/***/ function(module, exports) {

  
  module.exports = function(a, b){
    var fn = function(){};
    fn.prototype = b.prototype;
    a.prototype = new fn;
    a.prototype.constructor = a;
  };

/***/ },
/* 80 */,
/* 81 */,
/* 82 */,
/* 83 */,
/* 84 */
/***/ function(module, exports) {

  
  var indexOf = [].indexOf;

  module.exports = function(arr, obj){
    if (indexOf) return arr.indexOf(obj);
    for (var i = 0; i < arr.length; ++i) {
      if (arr[i] === obj) return i;
    }
    return -1;
  };

/***/ },
/* 85 */
/***/ function(module, exports) {

  module.exports = Array.isArray || function (arr) {
    return Object.prototype.toString.call(arr) == '[object Array]';
  };


/***/ },
/* 86 */,
/* 87 */
/***/ function(module, exports) {

  // shim for using process in browser
  var process = module.exports = {};

  // cached from whatever global is present so that test runners that stub it
  // don't break things.  But we need to wrap it in a try catch in case it is
  // wrapped in strict mode code which doesn't define any globals.  It's inside a
  // function because try/catches deoptimize in certain engines.

  var cachedSetTimeout;
  var cachedClearTimeout;

  function defaultSetTimout() {
      throw new Error('setTimeout has not been defined');
  }
  function defaultClearTimeout () {
      throw new Error('clearTimeout has not been defined');
  }
  (function () {
      try {
          if (typeof setTimeout === 'function') {
              cachedSetTimeout = setTimeout;
          } else {
              cachedSetTimeout = defaultSetTimout;
          }
      } catch (e) {
          cachedSetTimeout = defaultSetTimout;
      }
      try {
          if (typeof clearTimeout === 'function') {
              cachedClearTimeout = clearTimeout;
          } else {
              cachedClearTimeout = defaultClearTimeout;
          }
      } catch (e) {
          cachedClearTimeout = defaultClearTimeout;
      }
  } ())
  function runTimeout(fun) {
      if (cachedSetTimeout === setTimeout) {
          //normal enviroments in sane situations
          return setTimeout(fun, 0);
      }
      // if setTimeout wasn't available but was latter defined
      if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
          cachedSetTimeout = setTimeout;
          return setTimeout(fun, 0);
      }
      try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedSetTimeout(fun, 0);
      } catch(e){
          try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
              return cachedSetTimeout.call(null, fun, 0);
          } catch(e){
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
              return cachedSetTimeout.call(this, fun, 0);
          }
      }


  }
  function runClearTimeout(marker) {
      if (cachedClearTimeout === clearTimeout) {
          //normal enviroments in sane situations
          return clearTimeout(marker);
      }
      // if clearTimeout wasn't available but was latter defined
      if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
          cachedClearTimeout = clearTimeout;
          return clearTimeout(marker);
      }
      try {
          // when when somebody has screwed with setTimeout but no I.E. maddness
          return cachedClearTimeout(marker);
      } catch (e){
          try {
              // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
              return cachedClearTimeout.call(null, marker);
          } catch (e){
              // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
              // Some versions of I.E. have different rules for clearTimeout vs setTimeout
              return cachedClearTimeout.call(this, marker);
          }
      }



  }
  var queue = [];
  var draining = false;
  var currentQueue;
  var queueIndex = -1;

  function cleanUpNextTick() {
      if (!draining || !currentQueue) {
          return;
      }
      draining = false;
      if (currentQueue.length) {
          queue = currentQueue.concat(queue);
      } else {
          queueIndex = -1;
      }
      if (queue.length) {
          drainQueue();
      }
  }

  function drainQueue() {
      if (draining) {
          return;
      }
      var timeout = runTimeout(cleanUpNextTick);
      draining = true;

      var len = queue.length;
      while(len) {
          currentQueue = queue;
          queue = [];
          while (++queueIndex < len) {
              if (currentQueue) {
                  currentQueue[queueIndex].run();
              }
          }
          queueIndex = -1;
          len = queue.length;
      }
      currentQueue = null;
      draining = false;
      runClearTimeout(timeout);
  }

  process.nextTick = function (fun) {
      var args = new Array(arguments.length - 1);
      if (arguments.length > 1) {
          for (var i = 1; i < arguments.length; i++) {
              args[i - 1] = arguments[i];
          }
      }
      queue.push(new Item(fun, args));
      if (queue.length === 1 && !draining) {
          runTimeout(drainQueue);
      }
  };

  // v8 likes predictible objects
  function Item(fun, array) {
      this.fun = fun;
      this.array = array;
  }
  Item.prototype.run = function () {
      this.fun.apply(null, this.array);
  };
  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = ''; // empty string to avoid regexp issues
  process.versions = {};

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
      throw new Error('process.binding is not supported');
  };

  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
  };
  process.umask = function() { return 0; };


/***/ },
/* 88 */
/***/ function(module, exports) {

  
  /**
   * Expose `Emitter`.
   */

  module.exports = Emitter;

  /**
   * Initialize a new `Emitter`.
   *
   * @api public
   */

  function Emitter(obj) {
    if (obj) return mixin(obj);
  };

  /**
   * Mixin the emitter properties.
   *
   * @param {Object} obj
   * @return {Object}
   * @api private
   */

  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }

  /**
   * Listen on the given `event` with `fn`.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   * @api public
   */

  Emitter.prototype.on =
  Emitter.prototype.addEventListener = function(event, fn){
    this._callbacks = this._callbacks || {};
    (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
      .push(fn);
    return this;
  };

  /**
   * Adds an `event` listener that will be invoked a single
   * time then automatically removed.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   * @api public
   */

  Emitter.prototype.once = function(event, fn){
    function on() {
      this.off(event, on);
      fn.apply(this, arguments);
    }

    on.fn = fn;
    this.on(event, on);
    return this;
  };

  /**
   * Remove the given callback for `event` or all
   * registered callbacks.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   * @api public
   */

  Emitter.prototype.off =
  Emitter.prototype.removeListener =
  Emitter.prototype.removeAllListeners =
  Emitter.prototype.removeEventListener = function(event, fn){
    this._callbacks = this._callbacks || {};

    // all
    if (0 == arguments.length) {
      this._callbacks = {};
      return this;
    }

    // specific event
    var callbacks = this._callbacks['$' + event];
    if (!callbacks) return this;

    // remove all handlers
    if (1 == arguments.length) {
      delete this._callbacks['$' + event];
      return this;
    }

    // remove specific handler
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }
    return this;
  };

  /**
   * Emit `event` with the given args.
   *
   * @param {String} event
   * @param {Mixed} ...
   * @return {Emitter}
   */

  Emitter.prototype.emit = function(event){
    this._callbacks = this._callbacks || {};
    var args = [].slice.call(arguments, 1)
      , callbacks = this._callbacks['$' + event];

    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }

    return this;
  };

  /**
   * Return array of callbacks for `event`.
   *
   * @param {String} event
   * @return {Array}
   * @api public
   */

  Emitter.prototype.listeners = function(event){
    this._callbacks = this._callbacks || {};
    return this._callbacks['$' + event] || [];
  };

  /**
   * Check if this emitter has `event` handlers.
   *
   * @param {String} event
   * @return {Boolean}
   * @api public
   */

  Emitter.prototype.hasListeners = function(event){
    return !! this.listeners(event).length;
  };


/***/ },
/* 89 */,
/* 90 */,
/* 91 */,
/* 92 */,
/* 93 */,
/* 94 */,
/* 95 */
/***/ function(module, exports, __webpack_require__) {

  
  /**
   * This is the common logic for both the Node.js and web browser
   * implementations of `debug()`.
   *
   * Expose `debug()` as the module.
   */

  exports = module.exports = debug;
  exports.coerce = coerce;
  exports.disable = disable;
  exports.enable = enable;
  exports.enabled = enabled;
  exports.humanize = __webpack_require__(100);

  /**
   * The currently active debug mode names, and names to skip.
   */

  exports.names = [];
  exports.skips = [];

  /**
   * Map of special "%n" handling functions, for the debug "format" argument.
   *
   * Valid key names are a single, lowercased letter, i.e. "n".
   */

  exports.formatters = {};

  /**
   * Previously assigned color.
   */

  var prevColor = 0;

  /**
   * Previous log timestamp.
   */

  var prevTime;

  /**
   * Select a color.
   *
   * @return {Number}
   * @api private
   */

  function selectColor() {
    return exports.colors[prevColor++ % exports.colors.length];
  }

  /**
   * Create a debugger with the given `namespace`.
   *
   * @param {String} namespace
   * @return {Function}
   * @api public
   */

  function debug(namespace) {

    // define the `disabled` version
    function disabled() {
    }
    disabled.enabled = false;

    // define the `enabled` version
    function enabled() {

      var self = enabled;

      // set `diff` timestamp
      var curr = +new Date();
      var ms = curr - (prevTime || curr);
      self.diff = ms;
      self.prev = prevTime;
      self.curr = curr;
      prevTime = curr;

      // add the `color` if not set
      if (null == self.useColors) self.useColors = exports.useColors();
      if (null == self.color && self.useColors) self.color = selectColor();

      var args = Array.prototype.slice.call(arguments);

      args[0] = exports.coerce(args[0]);

      if ('string' !== typeof args[0]) {
        // anything else let's inspect with %o
        args = ['%o'].concat(args);
      }

      // apply any `formatters` transformations
      var index = 0;
      args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
        // if we encounter an escaped % then don't increase the array index
        if (match === '%%') return match;
        index++;
        var formatter = exports.formatters[format];
        if ('function' === typeof formatter) {
          var val = args[index];
          match = formatter.call(self, val);

          // now we need to remove `args[index]` since it's inlined in the `format`
          args.splice(index, 1);
          index--;
        }
        return match;
      });

      if ('function' === typeof exports.formatArgs) {
        args = exports.formatArgs.apply(self, args);
      }
      var logFn = enabled.log || exports.log || console.log.bind(console);
      logFn.apply(self, args);
    }
    enabled.enabled = true;

    var fn = exports.enabled(namespace) ? enabled : disabled;

    fn.namespace = namespace;

    return fn;
  }

  /**
   * Enables a debug mode by namespaces. This can include modes
   * separated by a colon and wildcards.
   *
   * @param {String} namespaces
   * @api public
   */

  function enable(namespaces) {
    exports.save(namespaces);

    var split = (namespaces || '').split(/[\s,]+/);
    var len = split.length;

    for (var i = 0; i < len; i++) {
      if (!split[i]) continue; // ignore empty strings
      namespaces = split[i].replace(/\*/g, '.*?');
      if (namespaces[0] === '-') {
        exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
      } else {
        exports.names.push(new RegExp('^' + namespaces + '$'));
      }
    }
  }

  /**
   * Disable debug output.
   *
   * @api public
   */

  function disable() {
    exports.enable('');
  }

  /**
   * Returns true if the given mode name is enabled, false otherwise.
   *
   * @param {String} name
   * @return {Boolean}
   * @api public
   */

  function enabled(name) {
    var i, len;
    for (i = 0, len = exports.skips.length; i < len; i++) {
      if (exports.skips[i].test(name)) {
        return false;
      }
    }
    for (i = 0, len = exports.names.length; i < len; i++) {
      if (exports.names[i].test(name)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Coerce `val`.
   *
   * @param {Mixed} val
   * @return {Mixed}
   * @api private
   */

  function coerce(val) {
    if (val instanceof Error) return val.stack || val.message;
    return val;
  }


/***/ },
/* 96 */
/***/ function(module, exports, __webpack_require__) {

  /**
   * Module dependencies.
   */

  var parser = __webpack_require__(48);
  var Emitter = __webpack_require__(98);

  /**
   * Module exports.
   */

  module.exports = Transport;

  /**
   * Transport abstract constructor.
   *
   * @param {Object} options.
   * @api private
   */

  function Transport (opts) {
    this.path = opts.path;
    this.hostname = opts.hostname;
    this.port = opts.port;
    this.secure = opts.secure;
    this.query = opts.query;
    this.timestampParam = opts.timestampParam;
    this.timestampRequests = opts.timestampRequests;
    this.readyState = '';
    this.agent = opts.agent || false;
    this.socket = opts.socket;
    this.enablesXDR = opts.enablesXDR;

    // SSL options for Node.js client
    this.pfx = opts.pfx;
    this.key = opts.key;
    this.passphrase = opts.passphrase;
    this.cert = opts.cert;
    this.ca = opts.ca;
    this.ciphers = opts.ciphers;
    this.rejectUnauthorized = opts.rejectUnauthorized;

    // other options for Node.js client
    this.extraHeaders = opts.extraHeaders;
  }

  /**
   * Mix in `Emitter`.
   */

  Emitter(Transport.prototype);

  /**
   * Emits an error.
   *
   * @param {String} str
   * @return {Transport} for chaining
   * @api public
   */

  Transport.prototype.onError = function (msg, desc) {
    var err = new Error(msg);
    err.type = 'TransportError';
    err.description = desc;
    this.emit('error', err);
    return this;
  };

  /**
   * Opens the transport.
   *
   * @api public
   */

  Transport.prototype.open = function () {
    if ('closed' == this.readyState || '' == this.readyState) {
      this.readyState = 'opening';
      this.doOpen();
    }

    return this;
  };

  /**
   * Closes the transport.
   *
   * @api private
   */

  Transport.prototype.close = function () {
    if ('opening' == this.readyState || 'open' == this.readyState) {
      this.doClose();
      this.onClose();
    }

    return this;
  };

  /**
   * Sends multiple packets.
   *
   * @param {Array} packets
   * @api private
   */

  Transport.prototype.send = function(packets){
    if ('open' == this.readyState) {
      this.write(packets);
    } else {
      throw new Error('Transport not open');
    }
  };

  /**
   * Called upon open
   *
   * @api private
   */

  Transport.prototype.onOpen = function () {
    this.readyState = 'open';
    this.writable = true;
    this.emit('open');
  };

  /**
   * Called with data.
   *
   * @param {String} data
   * @api private
   */

  Transport.prototype.onData = function(data){
    var packet = parser.decodePacket(data, this.socket.binaryType);
    this.onPacket(packet);
  };

  /**
   * Called with a decoded packet.
   */

  Transport.prototype.onPacket = function (packet) {
    this.emit('packet', packet);
  };

  /**
   * Called upon close.
   *
   * @api private
   */

  Transport.prototype.onClose = function () {
    this.readyState = 'closed';
    this.emit('close');
  };


/***/ },
/* 97 */
/***/ function(module, exports, __webpack_require__) {

  // browser shim for xmlhttprequest module
  var hasCORS = __webpack_require__(493);

  module.exports = function(opts) {
    var xdomain = opts.xdomain;

    // scheme must be same when usign XDomainRequest
    // http://blogs.msdn.com/b/ieinternals/archive/2010/05/13/xdomainrequest-restrictions-limitations-and-workarounds.aspx
    var xscheme = opts.xscheme;

    // XDomainRequest has a flow of not sending cookie, therefore it should be disabled as a default.
    // https://github.com/Automattic/engine.io-client/pull/217
    var enablesXDR = opts.enablesXDR;

    // XMLHttpRequest can be disabled on IE
    try {
      if ('undefined' != typeof XMLHttpRequest && (!xdomain || hasCORS)) {
        return new XMLHttpRequest();
      }
    } catch (e) { }

    // Use XDomainRequest for IE8 if enablesXDR is true
    // because loading bar keeps flashing when using jsonp-polling
    // https://github.com/yujiosaka/socke.io-ie8-loading-example
    try {
      if ('undefined' != typeof XDomainRequest && !xscheme && enablesXDR) {
        return new XDomainRequest();
      }
    } catch (e) { }

    if (!xdomain) {
      try {
        return new ActiveXObject('Microsoft.XMLHTTP');
      } catch(e) { }
    }
  }


/***/ },
/* 98 */
/***/ function(module, exports) {

  
  /**
   * Expose `Emitter`.
   */

  module.exports = Emitter;

  /**
   * Initialize a new `Emitter`.
   *
   * @api public
   */

  function Emitter(obj) {
    if (obj) return mixin(obj);
  };

  /**
   * Mixin the emitter properties.
   *
   * @param {Object} obj
   * @return {Object}
   * @api private
   */

  function mixin(obj) {
    for (var key in Emitter.prototype) {
      obj[key] = Emitter.prototype[key];
    }
    return obj;
  }

  /**
   * Listen on the given `event` with `fn`.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   * @api public
   */

  Emitter.prototype.on =
  Emitter.prototype.addEventListener = function(event, fn){
    this._callbacks = this._callbacks || {};
    (this._callbacks[event] = this._callbacks[event] || [])
      .push(fn);
    return this;
  };

  /**
   * Adds an `event` listener that will be invoked a single
   * time then automatically removed.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   * @api public
   */

  Emitter.prototype.once = function(event, fn){
    var self = this;
    this._callbacks = this._callbacks || {};

    function on() {
      self.off(event, on);
      fn.apply(this, arguments);
    }

    on.fn = fn;
    this.on(event, on);
    return this;
  };

  /**
   * Remove the given callback for `event` or all
   * registered callbacks.
   *
   * @param {String} event
   * @param {Function} fn
   * @return {Emitter}
   * @api public
   */

  Emitter.prototype.off =
  Emitter.prototype.removeListener =
  Emitter.prototype.removeAllListeners =
  Emitter.prototype.removeEventListener = function(event, fn){
    this._callbacks = this._callbacks || {};

    // all
    if (0 == arguments.length) {
      this._callbacks = {};
      return this;
    }

    // specific event
    var callbacks = this._callbacks[event];
    if (!callbacks) return this;

    // remove all handlers
    if (1 == arguments.length) {
      delete this._callbacks[event];
      return this;
    }

    // remove specific handler
    var cb;
    for (var i = 0; i < callbacks.length; i++) {
      cb = callbacks[i];
      if (cb === fn || cb.fn === fn) {
        callbacks.splice(i, 1);
        break;
      }
    }
    return this;
  };

  /**
   * Emit `event` with the given args.
   *
   * @param {String} event
   * @param {Mixed} ...
   * @return {Emitter}
   */

  Emitter.prototype.emit = function(event){
    this._callbacks = this._callbacks || {};
    var args = [].slice.call(arguments, 1)
      , callbacks = this._callbacks[event];

    if (callbacks) {
      callbacks = callbacks.slice(0);
      for (var i = 0, len = callbacks.length; i < len; ++i) {
        callbacks[i].apply(this, args);
      }
    }

    return this;
  };

  /**
   * Return array of callbacks for `event`.
   *
   * @param {String} event
   * @return {Array}
   * @api public
   */

  Emitter.prototype.listeners = function(event){
    this._callbacks = this._callbacks || {};
    return this._callbacks[event] || [];
  };

  /**
   * Check if this emitter has `event` handlers.
   *
   * @param {String} event
   * @return {Boolean}
   * @api public
   */

  Emitter.prototype.hasListeners = function(event){
    return !! this.listeners(event).length;
  };


/***/ },
/* 99 */,
/* 100 */
/***/ function(module, exports) {

  /**
   * Helpers.
   */

  var s = 1000;
  var m = s * 60;
  var h = m * 60;
  var d = h * 24;
  var y = d * 365.25;

  /**
   * Parse or format the given `val`.
   *
   * Options:
   *
   *  - `long` verbose formatting [false]
   *
   * @param {String|Number} val
   * @param {Object} options
   * @return {String|Number}
   * @api public
   */

  module.exports = function(val, options){
    options = options || {};
    if ('string' == typeof val) return parse(val);
    return options.long
      ? long(val)
      : short(val);
  };

  /**
   * Parse the given `str` and return milliseconds.
   *
   * @param {String} str
   * @return {Number}
   * @api private
   */

  function parse(str) {
    str = '' + str;
    if (str.length > 10000) return;
    var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
    if (!match) return;
    var n = parseFloat(match[1]);
    var type = (match[2] || 'ms').toLowerCase();
    switch (type) {
      case 'years':
      case 'year':
      case 'yrs':
      case 'yr':
      case 'y':
        return n * y;
      case 'days':
      case 'day':
      case 'd':
        return n * d;
      case 'hours':
      case 'hour':
      case 'hrs':
      case 'hr':
      case 'h':
        return n * h;
      case 'minutes':
      case 'minute':
      case 'mins':
      case 'min':
      case 'm':
        return n * m;
      case 'seconds':
      case 'second':
      case 'secs':
      case 'sec':
      case 's':
        return n * s;
      case 'milliseconds':
      case 'millisecond':
      case 'msecs':
      case 'msec':
      case 'ms':
        return n;
    }
  }

  /**
   * Short format for `ms`.
   *
   * @param {Number} ms
   * @return {String}
   * @api private
   */

  function short(ms) {
    if (ms >= d) return Math.round(ms / d) + 'd';
    if (ms >= h) return Math.round(ms / h) + 'h';
    if (ms >= m) return Math.round(ms / m) + 'm';
    if (ms >= s) return Math.round(ms / s) + 's';
    return ms + 'ms';
  }

  /**
   * Long format for `ms`.
   *
   * @param {Number} ms
   * @return {String}
   * @api private
   */

  function long(ms) {
    return plural(ms, d, 'day')
      || plural(ms, h, 'hour')
      || plural(ms, m, 'minute')
      || plural(ms, s, 'second')
      || ms + ' ms';
  }

  /**
   * Pluralization helper.
   */

  function plural(ms, n, name) {
    if (ms < n) return;
    if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
    return Math.ceil(ms / n) + ' ' + name + 's';
  }


/***/ },
/* 101 */
/***/ function(module, exports) {

  /**
   * Compiles a querystring
   * Returns string representation of the object
   *
   * @param {Object}
   * @api private
   */

  exports.encode = function (obj) {
    var str = '';

    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        if (str.length) str += '&';
        str += encodeURIComponent(i) + '=' + encodeURIComponent(obj[i]);
      }
    }

    return str;
  };

  /**
   * Parses a simple querystring into an object
   *
   * @param {String} qs
   * @api private
   */

  exports.decode = function(qs){
    var qry = {};
    var pairs = qs.split('&');
    for (var i = 0, l = pairs.length; i < l; i++) {
      var pair = pairs[i].split('=');
      qry[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1]);
    }
    return qry;
  };


/***/ },
/* 102 */,
/* 103 */,
/* 104 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var InnerSubscriber = (function (_super) {
      __extends(InnerSubscriber, _super);
      function InnerSubscriber(parent, outerValue, outerIndex) {
          _super.call(this);
          this.parent = parent;
          this.outerValue = outerValue;
          this.outerIndex = outerIndex;
          this.index = 0;
      }
      InnerSubscriber.prototype._next = function (value) {
          this.parent.notifyNext(this.outerValue, value, this.outerIndex, this.index++, this);
      };
      InnerSubscriber.prototype._error = function (error) {
          this.parent.notifyError(error, this);
          this.unsubscribe();
      };
      InnerSubscriber.prototype._complete = function () {
          this.parent.notifyComplete(this);
          this.unsubscribe();
      };
      return InnerSubscriber;
  }(Subscriber_1.Subscriber));
  exports.InnerSubscriber = InnerSubscriber;
  //# sourceMappingURL=InnerSubscriber.js.map

/***/ },
/* 105 */
/***/ function(module, exports) {

  "use strict";
  /**
   * An execution context and a data structure to order tasks and schedule their
   * execution. Provides a notion of (potentially virtual) time, through the
   * `now()` getter method.
   *
   * Each unit of work in a Scheduler is called an {@link Action}.
   *
   * ```ts
   * class Scheduler {
   *   now(): number;
   *   schedule(work, delay?, state?): Subscription;
   * }
   * ```
   *
   * @class Scheduler
   */
  var Scheduler = (function () {
      function Scheduler(SchedulerAction, now) {
          if (now === void 0) { now = Scheduler.now; }
          this.SchedulerAction = SchedulerAction;
          this.now = now;
      }
      /**
       * Schedules a function, `work`, for execution. May happen at some point in
       * the future, according to the `delay` parameter, if specified. May be passed
       * some context object, `state`, which will be passed to the `work` function.
       *
       * The given arguments will be processed an stored as an Action object in a
       * queue of actions.
       *
       * @param {function(state: ?T): ?Subscription} work A function representing a
       * task, or some unit of work to be executed by the Scheduler.
       * @param {number} [delay] Time to wait before executing the work, where the
       * time unit is implicit and defined by the Scheduler itself.
       * @param {T} [state] Some contextual data that the `work` function uses when
       * called by the Scheduler.
       * @return {Subscription} A subscription in order to be able to unsubscribe
       * the scheduled work.
       */
      Scheduler.prototype.schedule = function (work, delay, state) {
          if (delay === void 0) { delay = 0; }
          return new this.SchedulerAction(this, work).schedule(state, delay);
      };
      Scheduler.now = Date.now ? Date.now : function () { return +new Date(); };
      return Scheduler;
  }());
  exports.Scheduler = Scheduler;
  //# sourceMappingURL=Scheduler.js.map

/***/ },
/* 106 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscription_1 = __webpack_require__(6);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SubjectSubscription = (function (_super) {
      __extends(SubjectSubscription, _super);
      function SubjectSubscription(subject, subscriber) {
          _super.call(this);
          this.subject = subject;
          this.subscriber = subscriber;
          this.closed = false;
      }
      SubjectSubscription.prototype.unsubscribe = function () {
          if (this.closed) {
              return;
          }
          this.closed = true;
          var subject = this.subject;
          var observers = subject.observers;
          this.subject = null;
          if (!observers || observers.length === 0 || subject.isStopped || subject.closed) {
              return;
          }
          var subscriberIndex = observers.indexOf(this.subscriber);
          if (subscriberIndex !== -1) {
              observers.splice(subscriberIndex, 1);
          }
      };
      return SubjectSubscription;
  }(Subscription_1.Subscription));
  exports.SubjectSubscription = SubjectSubscription;
  //# sourceMappingURL=SubjectSubscription.js.map

/***/ },
/* 107 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var bindCallback_1 = __webpack_require__(253);
  Observable_1.Observable.bindCallback = bindCallback_1.bindCallback;
  //# sourceMappingURL=bindCallback.js.map

/***/ },
/* 108 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var bindNodeCallback_1 = __webpack_require__(254);
  Observable_1.Observable.bindNodeCallback = bindNodeCallback_1.bindNodeCallback;
  //# sourceMappingURL=bindNodeCallback.js.map

/***/ },
/* 109 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var combineLatest_1 = __webpack_require__(255);
  Observable_1.Observable.combineLatest = combineLatest_1.combineLatest;
  //# sourceMappingURL=combineLatest.js.map

/***/ },
/* 110 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var concat_1 = __webpack_require__(256);
  Observable_1.Observable.concat = concat_1.concat;
  //# sourceMappingURL=concat.js.map

/***/ },
/* 111 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var defer_1 = __webpack_require__(257);
  Observable_1.Observable.defer = defer_1.defer;
  //# sourceMappingURL=defer.js.map

/***/ },
/* 112 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var ajax_1 = __webpack_require__(259);
  Observable_1.Observable.ajax = ajax_1.ajax;
  //# sourceMappingURL=ajax.js.map

/***/ },
/* 113 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var webSocket_1 = __webpack_require__(260);
  Observable_1.Observable.webSocket = webSocket_1.webSocket;
  //# sourceMappingURL=webSocket.js.map

/***/ },
/* 114 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var empty_1 = __webpack_require__(261);
  Observable_1.Observable.empty = empty_1.empty;
  //# sourceMappingURL=empty.js.map

/***/ },
/* 115 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var forkJoin_1 = __webpack_require__(262);
  Observable_1.Observable.forkJoin = forkJoin_1.forkJoin;
  //# sourceMappingURL=forkJoin.js.map

/***/ },
/* 116 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var from_1 = __webpack_require__(263);
  Observable_1.Observable.from = from_1.from;
  //# sourceMappingURL=from.js.map

/***/ },
/* 117 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var fromEvent_1 = __webpack_require__(264);
  Observable_1.Observable.fromEvent = fromEvent_1.fromEvent;
  //# sourceMappingURL=fromEvent.js.map

/***/ },
/* 118 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var fromEventPattern_1 = __webpack_require__(265);
  Observable_1.Observable.fromEventPattern = fromEventPattern_1.fromEventPattern;
  //# sourceMappingURL=fromEventPattern.js.map

/***/ },
/* 119 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var fromPromise_1 = __webpack_require__(266);
  Observable_1.Observable.fromPromise = fromPromise_1.fromPromise;
  //# sourceMappingURL=fromPromise.js.map

/***/ },
/* 120 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var GenerateObservable_1 = __webpack_require__(243);
  Observable_1.Observable.generate = GenerateObservable_1.GenerateObservable.create;
  //# sourceMappingURL=generate.js.map

/***/ },
/* 121 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var if_1 = __webpack_require__(267);
  Observable_1.Observable.if = if_1._if;
  //# sourceMappingURL=if.js.map

/***/ },
/* 122 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var interval_1 = __webpack_require__(268);
  Observable_1.Observable.interval = interval_1.interval;
  //# sourceMappingURL=interval.js.map

/***/ },
/* 123 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var merge_1 = __webpack_require__(269);
  Observable_1.Observable.merge = merge_1.merge;
  //# sourceMappingURL=merge.js.map

/***/ },
/* 124 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var never_1 = __webpack_require__(270);
  Observable_1.Observable.never = never_1.never;
  //# sourceMappingURL=never.js.map

/***/ },
/* 125 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var of_1 = __webpack_require__(271);
  Observable_1.Observable.of = of_1.of;
  //# sourceMappingURL=of.js.map

/***/ },
/* 126 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var onErrorResumeNext_1 = __webpack_require__(65);
  Observable_1.Observable.onErrorResumeNext = onErrorResumeNext_1.onErrorResumeNextStatic;
  //# sourceMappingURL=onErrorResumeNext.js.map

/***/ },
/* 127 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var pairs_1 = __webpack_require__(272);
  Observable_1.Observable.pairs = pairs_1.pairs;
  //# sourceMappingURL=pairs.js.map

/***/ },
/* 128 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var race_1 = __webpack_require__(66);
  Observable_1.Observable.race = race_1.raceStatic;
  //# sourceMappingURL=race.js.map

/***/ },
/* 129 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var range_1 = __webpack_require__(273);
  Observable_1.Observable.range = range_1.range;
  //# sourceMappingURL=range.js.map

/***/ },
/* 130 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var throw_1 = __webpack_require__(274);
  Observable_1.Observable.throw = throw_1._throw;
  //# sourceMappingURL=throw.js.map

/***/ },
/* 131 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var timer_1 = __webpack_require__(275);
  Observable_1.Observable.timer = timer_1.timer;
  //# sourceMappingURL=timer.js.map

/***/ },
/* 132 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var using_1 = __webpack_require__(276);
  Observable_1.Observable.using = using_1.using;
  //# sourceMappingURL=using.js.map

/***/ },
/* 133 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var zip_1 = __webpack_require__(277);
  Observable_1.Observable.zip = zip_1.zip;
  //# sourceMappingURL=zip.js.map

/***/ },
/* 134 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var audit_1 = __webpack_require__(278);
  Observable_1.Observable.prototype.audit = audit_1.audit;
  //# sourceMappingURL=audit.js.map

/***/ },
/* 135 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var auditTime_1 = __webpack_require__(279);
  Observable_1.Observable.prototype.auditTime = auditTime_1.auditTime;
  //# sourceMappingURL=auditTime.js.map

/***/ },
/* 136 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var buffer_1 = __webpack_require__(280);
  Observable_1.Observable.prototype.buffer = buffer_1.buffer;
  //# sourceMappingURL=buffer.js.map

/***/ },
/* 137 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var bufferCount_1 = __webpack_require__(281);
  Observable_1.Observable.prototype.bufferCount = bufferCount_1.bufferCount;
  //# sourceMappingURL=bufferCount.js.map

/***/ },
/* 138 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var bufferTime_1 = __webpack_require__(282);
  Observable_1.Observable.prototype.bufferTime = bufferTime_1.bufferTime;
  //# sourceMappingURL=bufferTime.js.map

/***/ },
/* 139 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var bufferToggle_1 = __webpack_require__(283);
  Observable_1.Observable.prototype.bufferToggle = bufferToggle_1.bufferToggle;
  //# sourceMappingURL=bufferToggle.js.map

/***/ },
/* 140 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var bufferWhen_1 = __webpack_require__(284);
  Observable_1.Observable.prototype.bufferWhen = bufferWhen_1.bufferWhen;
  //# sourceMappingURL=bufferWhen.js.map

/***/ },
/* 141 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var catch_1 = __webpack_require__(285);
  Observable_1.Observable.prototype.catch = catch_1._catch;
  Observable_1.Observable.prototype._catch = catch_1._catch;
  //# sourceMappingURL=catch.js.map

/***/ },
/* 142 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var combineAll_1 = __webpack_require__(286);
  Observable_1.Observable.prototype.combineAll = combineAll_1.combineAll;
  //# sourceMappingURL=combineAll.js.map

/***/ },
/* 143 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var combineLatest_1 = __webpack_require__(37);
  Observable_1.Observable.prototype.combineLatest = combineLatest_1.combineLatest;
  //# sourceMappingURL=combineLatest.js.map

/***/ },
/* 144 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var concat_1 = __webpack_require__(38);
  Observable_1.Observable.prototype.concat = concat_1.concat;
  //# sourceMappingURL=concat.js.map

/***/ },
/* 145 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var concatAll_1 = __webpack_require__(287);
  Observable_1.Observable.prototype.concatAll = concatAll_1.concatAll;
  //# sourceMappingURL=concatAll.js.map

/***/ },
/* 146 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var concatMap_1 = __webpack_require__(288);
  Observable_1.Observable.prototype.concatMap = concatMap_1.concatMap;
  //# sourceMappingURL=concatMap.js.map

/***/ },
/* 147 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var concatMapTo_1 = __webpack_require__(289);
  Observable_1.Observable.prototype.concatMapTo = concatMapTo_1.concatMapTo;
  //# sourceMappingURL=concatMapTo.js.map

/***/ },
/* 148 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var count_1 = __webpack_require__(290);
  Observable_1.Observable.prototype.count = count_1.count;
  //# sourceMappingURL=count.js.map

/***/ },
/* 149 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var debounce_1 = __webpack_require__(291);
  Observable_1.Observable.prototype.debounce = debounce_1.debounce;
  //# sourceMappingURL=debounce.js.map

/***/ },
/* 150 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var debounceTime_1 = __webpack_require__(292);
  Observable_1.Observable.prototype.debounceTime = debounceTime_1.debounceTime;
  //# sourceMappingURL=debounceTime.js.map

/***/ },
/* 151 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var defaultIfEmpty_1 = __webpack_require__(293);
  Observable_1.Observable.prototype.defaultIfEmpty = defaultIfEmpty_1.defaultIfEmpty;
  //# sourceMappingURL=defaultIfEmpty.js.map

/***/ },
/* 152 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var delay_1 = __webpack_require__(294);
  Observable_1.Observable.prototype.delay = delay_1.delay;
  //# sourceMappingURL=delay.js.map

/***/ },
/* 153 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var delayWhen_1 = __webpack_require__(295);
  Observable_1.Observable.prototype.delayWhen = delayWhen_1.delayWhen;
  //# sourceMappingURL=delayWhen.js.map

/***/ },
/* 154 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var dematerialize_1 = __webpack_require__(296);
  Observable_1.Observable.prototype.dematerialize = dematerialize_1.dematerialize;
  //# sourceMappingURL=dematerialize.js.map

/***/ },
/* 155 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var distinct_1 = __webpack_require__(58);
  Observable_1.Observable.prototype.distinct = distinct_1.distinct;
  //# sourceMappingURL=distinct.js.map

/***/ },
/* 156 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var distinctKey_1 = __webpack_require__(297);
  Observable_1.Observable.prototype.distinctKey = distinctKey_1.distinctKey;
  //# sourceMappingURL=distinctKey.js.map

/***/ },
/* 157 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var distinctUntilChanged_1 = __webpack_require__(59);
  Observable_1.Observable.prototype.distinctUntilChanged = distinctUntilChanged_1.distinctUntilChanged;
  //# sourceMappingURL=distinctUntilChanged.js.map

/***/ },
/* 158 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var distinctUntilKeyChanged_1 = __webpack_require__(298);
  Observable_1.Observable.prototype.distinctUntilKeyChanged = distinctUntilKeyChanged_1.distinctUntilKeyChanged;
  //# sourceMappingURL=distinctUntilKeyChanged.js.map

/***/ },
/* 159 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var do_1 = __webpack_require__(299);
  Observable_1.Observable.prototype.do = do_1._do;
  Observable_1.Observable.prototype._do = do_1._do;
  //# sourceMappingURL=do.js.map

/***/ },
/* 160 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var elementAt_1 = __webpack_require__(300);
  Observable_1.Observable.prototype.elementAt = elementAt_1.elementAt;
  //# sourceMappingURL=elementAt.js.map

/***/ },
/* 161 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var every_1 = __webpack_require__(301);
  Observable_1.Observable.prototype.every = every_1.every;
  //# sourceMappingURL=every.js.map

/***/ },
/* 162 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var exhaust_1 = __webpack_require__(302);
  Observable_1.Observable.prototype.exhaust = exhaust_1.exhaust;
  //# sourceMappingURL=exhaust.js.map

/***/ },
/* 163 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var exhaustMap_1 = __webpack_require__(303);
  Observable_1.Observable.prototype.exhaustMap = exhaustMap_1.exhaustMap;
  //# sourceMappingURL=exhaustMap.js.map

/***/ },
/* 164 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var expand_1 = __webpack_require__(304);
  Observable_1.Observable.prototype.expand = expand_1.expand;
  //# sourceMappingURL=expand.js.map

/***/ },
/* 165 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var filter_1 = __webpack_require__(60);
  Observable_1.Observable.prototype.filter = filter_1.filter;
  //# sourceMappingURL=filter.js.map

/***/ },
/* 166 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var finally_1 = __webpack_require__(305);
  Observable_1.Observable.prototype.finally = finally_1._finally;
  Observable_1.Observable.prototype._finally = finally_1._finally;
  //# sourceMappingURL=finally.js.map

/***/ },
/* 167 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var find_1 = __webpack_require__(61);
  Observable_1.Observable.prototype.find = find_1.find;
  //# sourceMappingURL=find.js.map

/***/ },
/* 168 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var findIndex_1 = __webpack_require__(306);
  Observable_1.Observable.prototype.findIndex = findIndex_1.findIndex;
  //# sourceMappingURL=findIndex.js.map

/***/ },
/* 169 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var first_1 = __webpack_require__(307);
  Observable_1.Observable.prototype.first = first_1.first;
  //# sourceMappingURL=first.js.map

/***/ },
/* 170 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var groupBy_1 = __webpack_require__(308);
  Observable_1.Observable.prototype.groupBy = groupBy_1.groupBy;
  //# sourceMappingURL=groupBy.js.map

/***/ },
/* 171 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var ignoreElements_1 = __webpack_require__(309);
  Observable_1.Observable.prototype.ignoreElements = ignoreElements_1.ignoreElements;
  //# sourceMappingURL=ignoreElements.js.map

/***/ },
/* 172 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var isEmpty_1 = __webpack_require__(310);
  Observable_1.Observable.prototype.isEmpty = isEmpty_1.isEmpty;
  //# sourceMappingURL=isEmpty.js.map

/***/ },
/* 173 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var last_1 = __webpack_require__(311);
  Observable_1.Observable.prototype.last = last_1.last;
  //# sourceMappingURL=last.js.map

/***/ },
/* 174 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var let_1 = __webpack_require__(312);
  Observable_1.Observable.prototype.let = let_1.letProto;
  Observable_1.Observable.prototype.letBind = let_1.letProto;
  //# sourceMappingURL=let.js.map

/***/ },
/* 175 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var map_1 = __webpack_require__(39);
  Observable_1.Observable.prototype.map = map_1.map;
  //# sourceMappingURL=map.js.map

/***/ },
/* 176 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var mapTo_1 = __webpack_require__(313);
  Observable_1.Observable.prototype.mapTo = mapTo_1.mapTo;
  //# sourceMappingURL=mapTo.js.map

/***/ },
/* 177 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var materialize_1 = __webpack_require__(314);
  Observable_1.Observable.prototype.materialize = materialize_1.materialize;
  //# sourceMappingURL=materialize.js.map

/***/ },
/* 178 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var max_1 = __webpack_require__(315);
  Observable_1.Observable.prototype.max = max_1.max;
  //# sourceMappingURL=max.js.map

/***/ },
/* 179 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var merge_1 = __webpack_require__(62);
  Observable_1.Observable.prototype.merge = merge_1.merge;
  //# sourceMappingURL=merge.js.map

/***/ },
/* 180 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var mergeAll_1 = __webpack_require__(26);
  Observable_1.Observable.prototype.mergeAll = mergeAll_1.mergeAll;
  //# sourceMappingURL=mergeAll.js.map

/***/ },
/* 181 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var mergeMap_1 = __webpack_require__(63);
  Observable_1.Observable.prototype.mergeMap = mergeMap_1.mergeMap;
  Observable_1.Observable.prototype.flatMap = mergeMap_1.mergeMap;
  //# sourceMappingURL=mergeMap.js.map

/***/ },
/* 182 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var mergeMapTo_1 = __webpack_require__(64);
  Observable_1.Observable.prototype.flatMapTo = mergeMapTo_1.mergeMapTo;
  Observable_1.Observable.prototype.mergeMapTo = mergeMapTo_1.mergeMapTo;
  //# sourceMappingURL=mergeMapTo.js.map

/***/ },
/* 183 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var mergeScan_1 = __webpack_require__(316);
  Observable_1.Observable.prototype.mergeScan = mergeScan_1.mergeScan;
  //# sourceMappingURL=mergeScan.js.map

/***/ },
/* 184 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var min_1 = __webpack_require__(317);
  Observable_1.Observable.prototype.min = min_1.min;
  //# sourceMappingURL=min.js.map

/***/ },
/* 185 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var multicast_1 = __webpack_require__(17);
  Observable_1.Observable.prototype.multicast = multicast_1.multicast;
  //# sourceMappingURL=multicast.js.map

/***/ },
/* 186 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var observeOn_1 = __webpack_require__(40);
  Observable_1.Observable.prototype.observeOn = observeOn_1.observeOn;
  //# sourceMappingURL=observeOn.js.map

/***/ },
/* 187 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var onErrorResumeNext_1 = __webpack_require__(65);
  Observable_1.Observable.prototype.onErrorResumeNext = onErrorResumeNext_1.onErrorResumeNext;
  //# sourceMappingURL=onErrorResumeNext.js.map

/***/ },
/* 188 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var pairwise_1 = __webpack_require__(318);
  Observable_1.Observable.prototype.pairwise = pairwise_1.pairwise;
  //# sourceMappingURL=pairwise.js.map

/***/ },
/* 189 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var partition_1 = __webpack_require__(319);
  Observable_1.Observable.prototype.partition = partition_1.partition;
  //# sourceMappingURL=partition.js.map

/***/ },
/* 190 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var pluck_1 = __webpack_require__(320);
  Observable_1.Observable.prototype.pluck = pluck_1.pluck;
  //# sourceMappingURL=pluck.js.map

/***/ },
/* 191 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var publish_1 = __webpack_require__(321);
  Observable_1.Observable.prototype.publish = publish_1.publish;
  //# sourceMappingURL=publish.js.map

/***/ },
/* 192 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var publishBehavior_1 = __webpack_require__(322);
  Observable_1.Observable.prototype.publishBehavior = publishBehavior_1.publishBehavior;
  //# sourceMappingURL=publishBehavior.js.map

/***/ },
/* 193 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var publishLast_1 = __webpack_require__(323);
  Observable_1.Observable.prototype.publishLast = publishLast_1.publishLast;
  //# sourceMappingURL=publishLast.js.map

/***/ },
/* 194 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var publishReplay_1 = __webpack_require__(324);
  Observable_1.Observable.prototype.publishReplay = publishReplay_1.publishReplay;
  //# sourceMappingURL=publishReplay.js.map

/***/ },
/* 195 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var race_1 = __webpack_require__(66);
  Observable_1.Observable.prototype.race = race_1.race;
  //# sourceMappingURL=race.js.map

/***/ },
/* 196 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var reduce_1 = __webpack_require__(41);
  Observable_1.Observable.prototype.reduce = reduce_1.reduce;
  //# sourceMappingURL=reduce.js.map

/***/ },
/* 197 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var repeat_1 = __webpack_require__(325);
  Observable_1.Observable.prototype.repeat = repeat_1.repeat;
  //# sourceMappingURL=repeat.js.map

/***/ },
/* 198 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var repeatWhen_1 = __webpack_require__(326);
  Observable_1.Observable.prototype.repeatWhen = repeatWhen_1.repeatWhen;
  //# sourceMappingURL=repeatWhen.js.map

/***/ },
/* 199 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var retry_1 = __webpack_require__(327);
  Observable_1.Observable.prototype.retry = retry_1.retry;
  //# sourceMappingURL=retry.js.map

/***/ },
/* 200 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var retryWhen_1 = __webpack_require__(328);
  Observable_1.Observable.prototype.retryWhen = retryWhen_1.retryWhen;
  //# sourceMappingURL=retryWhen.js.map

/***/ },
/* 201 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var sample_1 = __webpack_require__(329);
  Observable_1.Observable.prototype.sample = sample_1.sample;
  //# sourceMappingURL=sample.js.map

/***/ },
/* 202 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var sampleTime_1 = __webpack_require__(330);
  Observable_1.Observable.prototype.sampleTime = sampleTime_1.sampleTime;
  //# sourceMappingURL=sampleTime.js.map

/***/ },
/* 203 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var scan_1 = __webpack_require__(331);
  Observable_1.Observable.prototype.scan = scan_1.scan;
  //# sourceMappingURL=scan.js.map

/***/ },
/* 204 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var sequenceEqual_1 = __webpack_require__(332);
  Observable_1.Observable.prototype.sequenceEqual = sequenceEqual_1.sequenceEqual;
  //# sourceMappingURL=sequenceEqual.js.map

/***/ },
/* 205 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var share_1 = __webpack_require__(333);
  Observable_1.Observable.prototype.share = share_1.share;
  //# sourceMappingURL=share.js.map

/***/ },
/* 206 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var single_1 = __webpack_require__(334);
  Observable_1.Observable.prototype.single = single_1.single;
  //# sourceMappingURL=single.js.map

/***/ },
/* 207 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var skip_1 = __webpack_require__(335);
  Observable_1.Observable.prototype.skip = skip_1.skip;
  //# sourceMappingURL=skip.js.map

/***/ },
/* 208 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var skipUntil_1 = __webpack_require__(336);
  Observable_1.Observable.prototype.skipUntil = skipUntil_1.skipUntil;
  //# sourceMappingURL=skipUntil.js.map

/***/ },
/* 209 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var skipWhile_1 = __webpack_require__(337);
  Observable_1.Observable.prototype.skipWhile = skipWhile_1.skipWhile;
  //# sourceMappingURL=skipWhile.js.map

/***/ },
/* 210 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var startWith_1 = __webpack_require__(338);
  Observable_1.Observable.prototype.startWith = startWith_1.startWith;
  //# sourceMappingURL=startWith.js.map

/***/ },
/* 211 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var subscribeOn_1 = __webpack_require__(339);
  Observable_1.Observable.prototype.subscribeOn = subscribeOn_1.subscribeOn;
  //# sourceMappingURL=subscribeOn.js.map

/***/ },
/* 212 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var switch_1 = __webpack_require__(340);
  Observable_1.Observable.prototype.switch = switch_1._switch;
  Observable_1.Observable.prototype._switch = switch_1._switch;
  //# sourceMappingURL=switch.js.map

/***/ },
/* 213 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var switchMap_1 = __webpack_require__(341);
  Observable_1.Observable.prototype.switchMap = switchMap_1.switchMap;
  //# sourceMappingURL=switchMap.js.map

/***/ },
/* 214 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var switchMapTo_1 = __webpack_require__(342);
  Observable_1.Observable.prototype.switchMapTo = switchMapTo_1.switchMapTo;
  //# sourceMappingURL=switchMapTo.js.map

/***/ },
/* 215 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var take_1 = __webpack_require__(343);
  Observable_1.Observable.prototype.take = take_1.take;
  //# sourceMappingURL=take.js.map

/***/ },
/* 216 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var takeLast_1 = __webpack_require__(344);
  Observable_1.Observable.prototype.takeLast = takeLast_1.takeLast;
  //# sourceMappingURL=takeLast.js.map

/***/ },
/* 217 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var takeUntil_1 = __webpack_require__(345);
  Observable_1.Observable.prototype.takeUntil = takeUntil_1.takeUntil;
  //# sourceMappingURL=takeUntil.js.map

/***/ },
/* 218 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var takeWhile_1 = __webpack_require__(346);
  Observable_1.Observable.prototype.takeWhile = takeWhile_1.takeWhile;
  //# sourceMappingURL=takeWhile.js.map

/***/ },
/* 219 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var throttle_1 = __webpack_require__(347);
  Observable_1.Observable.prototype.throttle = throttle_1.throttle;
  //# sourceMappingURL=throttle.js.map

/***/ },
/* 220 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var throttleTime_1 = __webpack_require__(348);
  Observable_1.Observable.prototype.throttleTime = throttleTime_1.throttleTime;
  //# sourceMappingURL=throttleTime.js.map

/***/ },
/* 221 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var timeInterval_1 = __webpack_require__(67);
  Observable_1.Observable.prototype.timeInterval = timeInterval_1.timeInterval;
  //# sourceMappingURL=timeInterval.js.map

/***/ },
/* 222 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var timeout_1 = __webpack_require__(349);
  Observable_1.Observable.prototype.timeout = timeout_1.timeout;
  //# sourceMappingURL=timeout.js.map

/***/ },
/* 223 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var timeoutWith_1 = __webpack_require__(350);
  Observable_1.Observable.prototype.timeoutWith = timeoutWith_1.timeoutWith;
  //# sourceMappingURL=timeoutWith.js.map

/***/ },
/* 224 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var timestamp_1 = __webpack_require__(68);
  Observable_1.Observable.prototype.timestamp = timestamp_1.timestamp;
  //# sourceMappingURL=timestamp.js.map

/***/ },
/* 225 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var toArray_1 = __webpack_require__(351);
  Observable_1.Observable.prototype.toArray = toArray_1.toArray;
  //# sourceMappingURL=toArray.js.map

/***/ },
/* 226 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var toPromise_1 = __webpack_require__(352);
  Observable_1.Observable.prototype.toPromise = toPromise_1.toPromise;
  //# sourceMappingURL=toPromise.js.map

/***/ },
/* 227 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var window_1 = __webpack_require__(353);
  Observable_1.Observable.prototype.window = window_1.window;
  //# sourceMappingURL=window.js.map

/***/ },
/* 228 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var windowCount_1 = __webpack_require__(354);
  Observable_1.Observable.prototype.windowCount = windowCount_1.windowCount;
  //# sourceMappingURL=windowCount.js.map

/***/ },
/* 229 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var windowTime_1 = __webpack_require__(355);
  Observable_1.Observable.prototype.windowTime = windowTime_1.windowTime;
  //# sourceMappingURL=windowTime.js.map

/***/ },
/* 230 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var windowToggle_1 = __webpack_require__(356);
  Observable_1.Observable.prototype.windowToggle = windowToggle_1.windowToggle;
  //# sourceMappingURL=windowToggle.js.map

/***/ },
/* 231 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var windowWhen_1 = __webpack_require__(357);
  Observable_1.Observable.prototype.windowWhen = windowWhen_1.windowWhen;
  //# sourceMappingURL=windowWhen.js.map

/***/ },
/* 232 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var withLatestFrom_1 = __webpack_require__(358);
  Observable_1.Observable.prototype.withLatestFrom = withLatestFrom_1.withLatestFrom;
  //# sourceMappingURL=withLatestFrom.js.map

/***/ },
/* 233 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var zip_1 = __webpack_require__(42);
  Observable_1.Observable.prototype.zip = zip_1.zipProto;
  //# sourceMappingURL=zip.js.map

/***/ },
/* 234 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Observable_1 = __webpack_require__(1);
  var zipAll_1 = __webpack_require__(359);
  Observable_1.Observable.prototype.zipAll = zipAll_1.zipAll;
  //# sourceMappingURL=zipAll.js.map

/***/ },
/* 235 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var ScalarObservable_1 = __webpack_require__(36);
  var EmptyObservable_1 = __webpack_require__(14);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var ArrayLikeObservable = (function (_super) {
      __extends(ArrayLikeObservable, _super);
      function ArrayLikeObservable(arrayLike, scheduler) {
          _super.call(this);
          this.arrayLike = arrayLike;
          this.scheduler = scheduler;
          if (!scheduler && arrayLike.length === 1) {
              this._isScalar = true;
              this.value = arrayLike[0];
          }
      }
      ArrayLikeObservable.create = function (arrayLike, scheduler) {
          var length = arrayLike.length;
          if (length === 0) {
              return new EmptyObservable_1.EmptyObservable();
          }
          else if (length === 1) {
              return new ScalarObservable_1.ScalarObservable(arrayLike[0], scheduler);
          }
          else {
              return new ArrayLikeObservable(arrayLike, scheduler);
          }
      };
      ArrayLikeObservable.dispatch = function (state) {
          var arrayLike = state.arrayLike, index = state.index, length = state.length, subscriber = state.subscriber;
          if (subscriber.closed) {
              return;
          }
          if (index >= length) {
              subscriber.complete();
              return;
          }
          subscriber.next(arrayLike[index]);
          state.index = index + 1;
          this.schedule(state);
      };
      ArrayLikeObservable.prototype._subscribe = function (subscriber) {
          var index = 0;
          var _a = this, arrayLike = _a.arrayLike, scheduler = _a.scheduler;
          var length = arrayLike.length;
          if (scheduler) {
              return scheduler.schedule(ArrayLikeObservable.dispatch, 0, {
                  arrayLike: arrayLike, index: index, length: length, subscriber: subscriber
              });
          }
          else {
              for (var i = 0; i < length && !subscriber.closed; i++) {
                  subscriber.next(arrayLike[i]);
              }
              subscriber.complete();
          }
      };
      return ArrayLikeObservable;
  }(Observable_1.Observable));
  exports.ArrayLikeObservable = ArrayLikeObservable;
  //# sourceMappingURL=ArrayLikeObservable.js.map

/***/ },
/* 236 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var AsyncSubject_1 = __webpack_require__(25);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var BoundCallbackObservable = (function (_super) {
      __extends(BoundCallbackObservable, _super);
      function BoundCallbackObservable(callbackFunc, selector, args, scheduler) {
          _super.call(this);
          this.callbackFunc = callbackFunc;
          this.selector = selector;
          this.args = args;
          this.scheduler = scheduler;
      }
      /* tslint:enable:max-line-length */
      /**
       * Converts a callback API to a function that returns an Observable.
       *
       * <span class="informal">Give it a function `f` of type `f(x, callback)` and
       * it will return a function `g` that when called as `g(x)` will output an
       * Observable.</span>
       *
       * `bindCallback` is not an operator because its input and output are not
       * Observables. The input is a function `func` with some parameters, but the
       * last parameter must be a callback function that `func` calls when it is
       * done. The output of `bindCallback` is a function that takes the same
       * parameters as `func`, except the last one (the callback). When the output
       * function is called with arguments, it will return an Observable where the
       * results will be delivered to.
       *
       * @example <caption>Convert jQuery's getJSON to an Observable API</caption>
       * // Suppose we have jQuery.getJSON('/my/url', callback)
       * var getJSONAsObservable = Rx.Observable.bindCallback(jQuery.getJSON);
       * var result = getJSONAsObservable('/my/url');
       * result.subscribe(x => console.log(x), e => console.error(e));
       *
       * @see {@link bindNodeCallback}
       * @see {@link from}
       * @see {@link fromPromise}
       *
       * @param {function} func Function with a callback as the last parameter.
       * @param {function} [selector] A function which takes the arguments from the
       * callback and maps those a value to emit on the output Observable.
       * @param {Scheduler} [scheduler] The scheduler on which to schedule the
       * callbacks.
       * @return {function(...params: *): Observable} A function which returns the
       * Observable that delivers the same values the callback would deliver.
       * @static true
       * @name bindCallback
       * @owner Observable
       */
      BoundCallbackObservable.create = function (func, selector, scheduler) {
          if (selector === void 0) { selector = undefined; }
          return function () {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  args[_i - 0] = arguments[_i];
              }
              return new BoundCallbackObservable(func, selector, args, scheduler);
          };
      };
      BoundCallbackObservable.prototype._subscribe = function (subscriber) {
          var callbackFunc = this.callbackFunc;
          var args = this.args;
          var scheduler = this.scheduler;
          var subject = this.subject;
          if (!scheduler) {
              if (!subject) {
                  subject = this.subject = new AsyncSubject_1.AsyncSubject();
                  var handler = function handlerFn() {
                      var innerArgs = [];
                      for (var _i = 0; _i < arguments.length; _i++) {
                          innerArgs[_i - 0] = arguments[_i];
                      }
                      var source = handlerFn.source;
                      var selector = source.selector, subject = source.subject;
                      if (selector) {
                          var result_1 = tryCatch_1.tryCatch(selector).apply(this, innerArgs);
                          if (result_1 === errorObject_1.errorObject) {
                              subject.error(errorObject_1.errorObject.e);
                          }
                          else {
                              subject.next(result_1);
                              subject.complete();
                          }
                      }
                      else {
                          subject.next(innerArgs.length === 1 ? innerArgs[0] : innerArgs);
                          subject.complete();
                      }
                  };
                  // use named function instance to avoid closure.
                  handler.source = this;
                  var result = tryCatch_1.tryCatch(callbackFunc).apply(this, args.concat(handler));
                  if (result === errorObject_1.errorObject) {
                      subject.error(errorObject_1.errorObject.e);
                  }
              }
              return subject.subscribe(subscriber);
          }
          else {
              return scheduler.schedule(BoundCallbackObservable.dispatch, 0, { source: this, subscriber: subscriber });
          }
      };
      BoundCallbackObservable.dispatch = function (state) {
          var self = this;
          var source = state.source, subscriber = state.subscriber;
          var callbackFunc = source.callbackFunc, args = source.args, scheduler = source.scheduler;
          var subject = source.subject;
          if (!subject) {
              subject = source.subject = new AsyncSubject_1.AsyncSubject();
              var handler = function handlerFn() {
                  var innerArgs = [];
                  for (var _i = 0; _i < arguments.length; _i++) {
                      innerArgs[_i - 0] = arguments[_i];
                  }
                  var source = handlerFn.source;
                  var selector = source.selector, subject = source.subject;
                  if (selector) {
                      var result_2 = tryCatch_1.tryCatch(selector).apply(this, innerArgs);
                      if (result_2 === errorObject_1.errorObject) {
                          self.add(scheduler.schedule(dispatchError, 0, { err: errorObject_1.errorObject.e, subject: subject }));
                      }
                      else {
                          self.add(scheduler.schedule(dispatchNext, 0, { value: result_2, subject: subject }));
                      }
                  }
                  else {
                      var value = innerArgs.length === 1 ? innerArgs[0] : innerArgs;
                      self.add(scheduler.schedule(dispatchNext, 0, { value: value, subject: subject }));
                  }
              };
              // use named function to pass values in without closure
              handler.source = source;
              var result = tryCatch_1.tryCatch(callbackFunc).apply(this, args.concat(handler));
              if (result === errorObject_1.errorObject) {
                  subject.error(errorObject_1.errorObject.e);
              }
          }
          self.add(subject.subscribe(subscriber));
      };
      return BoundCallbackObservable;
  }(Observable_1.Observable));
  exports.BoundCallbackObservable = BoundCallbackObservable;
  function dispatchNext(arg) {
      var value = arg.value, subject = arg.subject;
      subject.next(value);
      subject.complete();
  }
  function dispatchError(arg) {
      var err = arg.err, subject = arg.subject;
      subject.error(err);
  }
  //# sourceMappingURL=BoundCallbackObservable.js.map

/***/ },
/* 237 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var AsyncSubject_1 = __webpack_require__(25);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var BoundNodeCallbackObservable = (function (_super) {
      __extends(BoundNodeCallbackObservable, _super);
      function BoundNodeCallbackObservable(callbackFunc, selector, args, scheduler) {
          _super.call(this);
          this.callbackFunc = callbackFunc;
          this.selector = selector;
          this.args = args;
          this.scheduler = scheduler;
      }
      /* tslint:enable:max-line-length */
      /**
       * Converts a Node.js-style callback API to a function that returns an
       * Observable.
       *
       * <span class="informal">It's just like {@link bindCallback}, but the
       * callback is expected to be of type `callback(error, result)`.</span>
       *
       * `bindNodeCallback` is not an operator because its input and output are not
       * Observables. The input is a function `func` with some parameters, but the
       * last parameter must be a callback function that `func` calls when it is
       * done. The callback function is expected to follow Node.js conventions,
       * where the first argument to the callback is an error, while remaining
       * arguments are the callback result. The output of `bindNodeCallback` is a
       * function that takes the same parameters as `func`, except the last one (the
       * callback). When the output function is called with arguments, it will
       * return an Observable where the results will be delivered to.
       *
       * @example <caption>Read a file from the filesystem and get the data as an Observable</caption>
       * import * as fs from 'fs';
       * var readFileAsObservable = Rx.Observable.bindNodeCallback(fs.readFile);
       * var result = readFileAsObservable('./roadNames.txt', 'utf8');
       * result.subscribe(x => console.log(x), e => console.error(e));
       *
       * @see {@link bindCallback}
       * @see {@link from}
       * @see {@link fromPromise}
       *
       * @param {function} func Function with a callback as the last parameter.
       * @param {function} [selector] A function which takes the arguments from the
       * callback and maps those a value to emit on the output Observable.
       * @param {Scheduler} [scheduler] The scheduler on which to schedule the
       * callbacks.
       * @return {function(...params: *): Observable} A function which returns the
       * Observable that delivers the same values the Node.js callback would
       * deliver.
       * @static true
       * @name bindNodeCallback
       * @owner Observable
       */
      BoundNodeCallbackObservable.create = function (func, selector, scheduler) {
          if (selector === void 0) { selector = undefined; }
          return function () {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  args[_i - 0] = arguments[_i];
              }
              return new BoundNodeCallbackObservable(func, selector, args, scheduler);
          };
      };
      BoundNodeCallbackObservable.prototype._subscribe = function (subscriber) {
          var callbackFunc = this.callbackFunc;
          var args = this.args;
          var scheduler = this.scheduler;
          var subject = this.subject;
          if (!scheduler) {
              if (!subject) {
                  subject = this.subject = new AsyncSubject_1.AsyncSubject();
                  var handler = function handlerFn() {
                      var innerArgs = [];
                      for (var _i = 0; _i < arguments.length; _i++) {
                          innerArgs[_i - 0] = arguments[_i];
                      }
                      var source = handlerFn.source;
                      var selector = source.selector, subject = source.subject;
                      var err = innerArgs.shift();
                      if (err) {
                          subject.error(err);
                      }
                      else if (selector) {
                          var result_1 = tryCatch_1.tryCatch(selector).apply(this, innerArgs);
                          if (result_1 === errorObject_1.errorObject) {
                              subject.error(errorObject_1.errorObject.e);
                          }
                          else {
                              subject.next(result_1);
                              subject.complete();
                          }
                      }
                      else {
                          subject.next(innerArgs.length === 1 ? innerArgs[0] : innerArgs);
                          subject.complete();
                      }
                  };
                  // use named function instance to avoid closure.
                  handler.source = this;
                  var result = tryCatch_1.tryCatch(callbackFunc).apply(this, args.concat(handler));
                  if (result === errorObject_1.errorObject) {
                      subject.error(errorObject_1.errorObject.e);
                  }
              }
              return subject.subscribe(subscriber);
          }
          else {
              return scheduler.schedule(dispatch, 0, { source: this, subscriber: subscriber });
          }
      };
      return BoundNodeCallbackObservable;
  }(Observable_1.Observable));
  exports.BoundNodeCallbackObservable = BoundNodeCallbackObservable;
  function dispatch(state) {
      var self = this;
      var source = state.source, subscriber = state.subscriber;
      // XXX: cast to `any` to access to the private field in `source`.
      var _a = source, callbackFunc = _a.callbackFunc, args = _a.args, scheduler = _a.scheduler;
      var subject = source.subject;
      if (!subject) {
          subject = source.subject = new AsyncSubject_1.AsyncSubject();
          var handler = function handlerFn() {
              var innerArgs = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  innerArgs[_i - 0] = arguments[_i];
              }
              var source = handlerFn.source;
              var selector = source.selector, subject = source.subject;
              var err = innerArgs.shift();
              if (err) {
                  subject.error(err);
              }
              else if (selector) {
                  var result_2 = tryCatch_1.tryCatch(selector).apply(this, innerArgs);
                  if (result_2 === errorObject_1.errorObject) {
                      self.add(scheduler.schedule(dispatchError, 0, { err: errorObject_1.errorObject.e, subject: subject }));
                  }
                  else {
                      self.add(scheduler.schedule(dispatchNext, 0, { value: result_2, subject: subject }));
                  }
              }
              else {
                  var value = innerArgs.length === 1 ? innerArgs[0] : innerArgs;
                  self.add(scheduler.schedule(dispatchNext, 0, { value: value, subject: subject }));
              }
          };
          // use named function to pass values in without closure
          handler.source = source;
          var result = tryCatch_1.tryCatch(callbackFunc).apply(this, args.concat(handler));
          if (result === errorObject_1.errorObject) {
              subject.error(errorObject_1.errorObject.e);
          }
      }
      self.add(subject.subscribe(subscriber));
  }
  function dispatchNext(arg) {
      var value = arg.value, subject = arg.subject;
      subject.next(value);
      subject.complete();
  }
  function dispatchError(arg) {
      var err = arg.err, subject = arg.subject;
      subject.error(err);
  }
  //# sourceMappingURL=BoundNodeCallbackObservable.js.map

/***/ },
/* 238 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var DeferObservable = (function (_super) {
      __extends(DeferObservable, _super);
      function DeferObservable(observableFactory) {
          _super.call(this);
          this.observableFactory = observableFactory;
      }
      /**
       * Creates an Observable that, on subscribe, calls an Observable factory to
       * make an Observable for each new Observer.
       *
       * <span class="informal">Creates the Observable lazily, that is, only when it
       * is subscribed.
       * </span>
       *
       * <img src="./img/defer.png" width="100%">
       *
       * `defer` allows you to create the Observable only when the Observer
       * subscribes, and create a fresh Observable for each Observer. It waits until
       * an Observer subscribes to it, and then it generates an Observable,
       * typically with an Observable factory function. It does this afresh for each
       * subscriber, so although each subscriber may think it is subscribing to the
       * same Observable, in fact each subscriber gets its own individual
       * Observable.
       *
       * @example <caption>Subscribe to either an Observable of clicks or an Observable of interval, at random</caption>
       * var clicksOrInterval = Rx.Observable.defer(function () {
       *   if (Math.random() > 0.5) {
       *     return Rx.Observable.fromEvent(document, 'click');
       *   } else {
       *     return Rx.Observable.interval(1000);
       *   }
       * });
       * clicksOrInterval.subscribe(x => console.log(x));
       *
       * @see {@link create}
       *
       * @param {function(): Observable|Promise} observableFactory The Observable
       * factory function to invoke for each Observer that subscribes to the output
       * Observable. May also return a Promise, which will be converted on the fly
       * to an Observable.
       * @return {Observable} An Observable whose Observers' subscriptions trigger
       * an invocation of the given Observable factory function.
       * @static true
       * @name defer
       * @owner Observable
       */
      DeferObservable.create = function (observableFactory) {
          return new DeferObservable(observableFactory);
      };
      DeferObservable.prototype._subscribe = function (subscriber) {
          return new DeferSubscriber(subscriber, this.observableFactory);
      };
      return DeferObservable;
  }(Observable_1.Observable));
  exports.DeferObservable = DeferObservable;
  var DeferSubscriber = (function (_super) {
      __extends(DeferSubscriber, _super);
      function DeferSubscriber(destination, factory) {
          _super.call(this, destination);
          this.factory = factory;
          this.tryDefer();
      }
      DeferSubscriber.prototype.tryDefer = function () {
          try {
              this._callFactory();
          }
          catch (err) {
              this._error(err);
          }
      };
      DeferSubscriber.prototype._callFactory = function () {
          var result = this.factory();
          if (result) {
              this.add(subscribeToResult_1.subscribeToResult(this, result));
          }
      };
      return DeferSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=DeferObservable.js.map

/***/ },
/* 239 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var ErrorObservable = (function (_super) {
      __extends(ErrorObservable, _super);
      function ErrorObservable(error, scheduler) {
          _super.call(this);
          this.error = error;
          this.scheduler = scheduler;
      }
      /**
       * Creates an Observable that emits no items to the Observer and immediately
       * emits an error notification.
       *
       * <span class="informal">Just emits 'error', and nothing else.
       * </span>
       *
       * <img src="./img/throw.png" width="100%">
       *
       * This static operator is useful for creating a simple Observable that only
       * emits the error notification. It can be used for composing with other
       * Observables, such as in a {@link mergeMap}.
       *
       * @example <caption>Emit the number 7, then emit an error.</caption>
       * var result = Rx.Observable.throw(new Error('oops!')).startWith(7);
       * result.subscribe(x => console.log(x), e => console.error(e));
       *
       * @example <caption>Map and flattens numbers to the sequence 'a', 'b', 'c', but throw an error for 13</caption>
       * var interval = Rx.Observable.interval(1000);
       * var result = interval.mergeMap(x =>
       *   x === 13 ?
       *     Rx.Observable.throw('Thirteens are bad') :
       *     Rx.Observable.of('a', 'b', 'c')
       * );
       * result.subscribe(x => console.log(x), e => console.error(e));
       *
       * @see {@link create}
       * @see {@link empty}
       * @see {@link never}
       * @see {@link of}
       *
       * @param {any} error The particular Error to pass to the error notification.
       * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
       * the emission of the error notification.
       * @return {Observable} An error Observable: emits only the error notification
       * using the given error argument.
       * @static true
       * @name throw
       * @owner Observable
       */
      ErrorObservable.create = function (error, scheduler) {
          return new ErrorObservable(error, scheduler);
      };
      ErrorObservable.dispatch = function (arg) {
          var error = arg.error, subscriber = arg.subscriber;
          subscriber.error(error);
      };
      ErrorObservable.prototype._subscribe = function (subscriber) {
          var error = this.error;
          var scheduler = this.scheduler;
          if (scheduler) {
              return scheduler.schedule(ErrorObservable.dispatch, 0, {
                  error: error, subscriber: subscriber
              });
          }
          else {
              subscriber.error(error);
          }
      };
      return ErrorObservable;
  }(Observable_1.Observable));
  exports.ErrorObservable = ErrorObservable;
  //# sourceMappingURL=ErrorObservable.js.map

/***/ },
/* 240 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var EmptyObservable_1 = __webpack_require__(14);
  var isArray_1 = __webpack_require__(11);
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var ForkJoinObservable = (function (_super) {
      __extends(ForkJoinObservable, _super);
      function ForkJoinObservable(sources, resultSelector) {
          _super.call(this);
          this.sources = sources;
          this.resultSelector = resultSelector;
      }
      /* tslint:enable:max-line-length */
      /**
       * @param sources
       * @return {any}
       * @static true
       * @name forkJoin
       * @owner Observable
       */
      ForkJoinObservable.create = function () {
          var sources = [];
          for (var _i = 0; _i < arguments.length; _i++) {
              sources[_i - 0] = arguments[_i];
          }
          if (sources === null || arguments.length === 0) {
              return new EmptyObservable_1.EmptyObservable();
          }
          var resultSelector = null;
          if (typeof sources[sources.length - 1] === 'function') {
              resultSelector = sources.pop();
          }
          // if the first and only other argument besides the resultSelector is an array
          // assume it's been called with `forkJoin([obs1, obs2, obs3], resultSelector)`
          if (sources.length === 1 && isArray_1.isArray(sources[0])) {
              sources = sources[0];
          }
          if (sources.length === 0) {
              return new EmptyObservable_1.EmptyObservable();
          }
          return new ForkJoinObservable(sources, resultSelector);
      };
      ForkJoinObservable.prototype._subscribe = function (subscriber) {
          return new ForkJoinSubscriber(subscriber, this.sources, this.resultSelector);
      };
      return ForkJoinObservable;
  }(Observable_1.Observable));
  exports.ForkJoinObservable = ForkJoinObservable;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ForkJoinSubscriber = (function (_super) {
      __extends(ForkJoinSubscriber, _super);
      function ForkJoinSubscriber(destination, sources, resultSelector) {
          _super.call(this, destination);
          this.sources = sources;
          this.resultSelector = resultSelector;
          this.completed = 0;
          this.haveValues = 0;
          var len = sources.length;
          this.total = len;
          this.values = new Array(len);
          for (var i = 0; i < len; i++) {
              var source = sources[i];
              var innerSubscription = subscribeToResult_1.subscribeToResult(this, source, null, i);
              if (innerSubscription) {
                  innerSubscription.outerIndex = i;
                  this.add(innerSubscription);
              }
          }
      }
      ForkJoinSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.values[outerIndex] = innerValue;
          if (!innerSub._hasValue) {
              innerSub._hasValue = true;
              this.haveValues++;
          }
      };
      ForkJoinSubscriber.prototype.notifyComplete = function (innerSub) {
          var destination = this.destination;
          var _a = this, haveValues = _a.haveValues, resultSelector = _a.resultSelector, values = _a.values;
          var len = values.length;
          if (!innerSub._hasValue) {
              destination.complete();
              return;
          }
          this.completed++;
          if (this.completed !== len) {
              return;
          }
          if (haveValues === len) {
              var value = resultSelector ? resultSelector.apply(this, values) : values;
              destination.next(value);
          }
          destination.complete();
      };
      return ForkJoinSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=ForkJoinObservable.js.map

/***/ },
/* 241 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var tryCatch_1 = __webpack_require__(8);
  var isFunction_1 = __webpack_require__(44);
  var errorObject_1 = __webpack_require__(7);
  var Subscription_1 = __webpack_require__(6);
  function isNodeStyleEventEmmitter(sourceObj) {
      return !!sourceObj && typeof sourceObj.addListener === 'function' && typeof sourceObj.removeListener === 'function';
  }
  function isJQueryStyleEventEmitter(sourceObj) {
      return !!sourceObj && typeof sourceObj.on === 'function' && typeof sourceObj.off === 'function';
  }
  function isNodeList(sourceObj) {
      return !!sourceObj && sourceObj.toString() === '[object NodeList]';
  }
  function isHTMLCollection(sourceObj) {
      return !!sourceObj && sourceObj.toString() === '[object HTMLCollection]';
  }
  function isEventTarget(sourceObj) {
      return !!sourceObj && typeof sourceObj.addEventListener === 'function' && typeof sourceObj.removeEventListener === 'function';
  }
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var FromEventObservable = (function (_super) {
      __extends(FromEventObservable, _super);
      function FromEventObservable(sourceObj, eventName, selector, options) {
          _super.call(this);
          this.sourceObj = sourceObj;
          this.eventName = eventName;
          this.selector = selector;
          this.options = options;
      }
      /* tslint:enable:max-line-length */
      /**
       * Creates an Observable that emits events of a specific type coming from the
       * given event target.
       *
       * <span class="informal">Creates an Observable from DOM events, or Node
       * EventEmitter events or others.</span>
       *
       * <img src="./img/fromEvent.png" width="100%">
       *
       * Creates an Observable by attaching an event listener to an "event target",
       * which may be an object with `addEventListener` and `removeEventListener`,
       * a Node.js EventEmitter, a jQuery style EventEmitter, a NodeList from the
       * DOM, or an HTMLCollection from the DOM. The event handler is attached when
       * the output Observable is subscribed, and removed when the Subscription is
       * unsubscribed.
       *
       * @example <caption>Emits clicks happening on the DOM document</caption>
       * var clicks = Rx.Observable.fromEvent(document, 'click');
       * clicks.subscribe(x => console.log(x));
       *
       * @see {@link from}
       * @see {@link fromEventPattern}
       *
       * @param {EventTargetLike} target The DOMElement, event target, Node.js
       * EventEmitter, NodeList or HTMLCollection to attach the event handler to.
       * @param {string} eventName The event name of interest, being emitted by the
       * `target`.
       * @parm {EventListenerOptions} [options] Options to pass through to addEventListener
       * @param {SelectorMethodSignature<T>} [selector] An optional function to
       * post-process results. It takes the arguments from the event handler and
       * should return a single value.
       * @return {Observable<T>}
       * @static true
       * @name fromEvent
       * @owner Observable
       */
      FromEventObservable.create = function (target, eventName, options, selector) {
          if (isFunction_1.isFunction(options)) {
              selector = options;
              options = undefined;
          }
          return new FromEventObservable(target, eventName, selector, options);
      };
      FromEventObservable.setupSubscription = function (sourceObj, eventName, handler, subscriber, options) {
          var unsubscribe;
          if (isNodeList(sourceObj) || isHTMLCollection(sourceObj)) {
              for (var i = 0, len = sourceObj.length; i < len; i++) {
                  FromEventObservable.setupSubscription(sourceObj[i], eventName, handler, subscriber, options);
              }
          }
          else if (isEventTarget(sourceObj)) {
              var source_1 = sourceObj;
              sourceObj.addEventListener(eventName, handler, options);
              unsubscribe = function () { return source_1.removeEventListener(eventName, handler); };
          }
          else if (isJQueryStyleEventEmitter(sourceObj)) {
              var source_2 = sourceObj;
              sourceObj.on(eventName, handler);
              unsubscribe = function () { return source_2.off(eventName, handler); };
          }
          else if (isNodeStyleEventEmmitter(sourceObj)) {
              var source_3 = sourceObj;
              sourceObj.addListener(eventName, handler);
              unsubscribe = function () { return source_3.removeListener(eventName, handler); };
          }
          subscriber.add(new Subscription_1.Subscription(unsubscribe));
      };
      FromEventObservable.prototype._subscribe = function (subscriber) {
          var sourceObj = this.sourceObj;
          var eventName = this.eventName;
          var options = this.options;
          var selector = this.selector;
          var handler = selector ? function () {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  args[_i - 0] = arguments[_i];
              }
              var result = tryCatch_1.tryCatch(selector).apply(void 0, args);
              if (result === errorObject_1.errorObject) {
                  subscriber.error(errorObject_1.errorObject.e);
              }
              else {
                  subscriber.next(result);
              }
          } : function (e) { return subscriber.next(e); };
          FromEventObservable.setupSubscription(sourceObj, eventName, handler, subscriber, options);
      };
      return FromEventObservable;
  }(Observable_1.Observable));
  exports.FromEventObservable = FromEventObservable;
  //# sourceMappingURL=FromEventObservable.js.map

/***/ },
/* 242 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var Subscription_1 = __webpack_require__(6);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var FromEventPatternObservable = (function (_super) {
      __extends(FromEventPatternObservable, _super);
      function FromEventPatternObservable(addHandler, removeHandler, selector) {
          _super.call(this);
          this.addHandler = addHandler;
          this.removeHandler = removeHandler;
          this.selector = selector;
      }
      /**
       * Creates an Observable from an API based on addHandler/removeHandler
       * functions.
       *
       * <span class="informal">Converts any addHandler/removeHandler API to an
       * Observable.</span>
       *
       * <img src="./img/fromEventPattern.png" width="100%">
       *
       * Creates an Observable by using the `addHandler` and `removeHandler`
       * functions to add and remove the handlers, with an optional selector
       * function to project the event arguments to a result. The `addHandler` is
       * called when the output Observable is subscribed, and `removeHandler` is
       * called when the Subscription is unsubscribed.
       *
       * @example <caption>Emits clicks happening on the DOM document</caption>
       * function addClickHandler(handler) {
       *   document.addEventListener('click', handler);
       * }
       *
       * function removeClickHandler(handler) {
       *   document.removeEventListener('click', handler);
       * }
       *
       * var clicks = Rx.Observable.fromEventPattern(
       *   addClickHandler,
       *   removeClickHandler
       * );
       * clicks.subscribe(x => console.log(x));
       *
       * @see {@link from}
       * @see {@link fromEvent}
       *
       * @param {function(handler: Function): any} addHandler A function that takes
       * a `handler` function as argument and attaches it somehow to the actual
       * source of events.
       * @param {function(handler: Function): void} removeHandler A function that
       * takes a `handler` function as argument and removes it in case it was
       * previously attached using `addHandler`.
       * @param {function(...args: any): T} [selector] An optional function to
       * post-process results. It takes the arguments from the event handler and
       * should return a single value.
       * @return {Observable<T>}
       * @static true
       * @name fromEventPattern
       * @owner Observable
       */
      FromEventPatternObservable.create = function (addHandler, removeHandler, selector) {
          return new FromEventPatternObservable(addHandler, removeHandler, selector);
      };
      FromEventPatternObservable.prototype._subscribe = function (subscriber) {
          var _this = this;
          var removeHandler = this.removeHandler;
          var handler = !!this.selector ? function () {
              var args = [];
              for (var _i = 0; _i < arguments.length; _i++) {
                  args[_i - 0] = arguments[_i];
              }
              _this._callSelector(subscriber, args);
          } : function (e) { subscriber.next(e); };
          this._callAddHandler(handler, subscriber);
          subscriber.add(new Subscription_1.Subscription(function () {
              //TODO: determine whether or not to forward to error handler
              removeHandler(handler);
          }));
      };
      FromEventPatternObservable.prototype._callSelector = function (subscriber, args) {
          try {
              var result = this.selector.apply(this, args);
              subscriber.next(result);
          }
          catch (e) {
              subscriber.error(e);
          }
      };
      FromEventPatternObservable.prototype._callAddHandler = function (handler, errorSubscriber) {
          try {
              this.addHandler(handler);
          }
          catch (e) {
              errorSubscriber.error(e);
          }
      };
      return FromEventPatternObservable;
  }(Observable_1.Observable));
  exports.FromEventPatternObservable = FromEventPatternObservable;
  //# sourceMappingURL=FromEventPatternObservable.js.map

/***/ },
/* 243 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var isScheduler_1 = __webpack_require__(15);
  var selfSelector = function (value) { return value; };
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var GenerateObservable = (function (_super) {
      __extends(GenerateObservable, _super);
      function GenerateObservable(initialState, condition, iterate, resultSelector, scheduler) {
          _super.call(this);
          this.initialState = initialState;
          this.condition = condition;
          this.iterate = iterate;
          this.resultSelector = resultSelector;
          this.scheduler = scheduler;
      }
      GenerateObservable.create = function (initialStateOrOptions, condition, iterate, resultSelectorOrObservable, scheduler) {
          if (arguments.length == 1) {
              return new GenerateObservable(initialStateOrOptions.initialState, initialStateOrOptions.condition, initialStateOrOptions.iterate, initialStateOrOptions.resultSelector || selfSelector, initialStateOrOptions.scheduler);
          }
          if (resultSelectorOrObservable === undefined || isScheduler_1.isScheduler(resultSelectorOrObservable)) {
              return new GenerateObservable(initialStateOrOptions, condition, iterate, selfSelector, resultSelectorOrObservable);
          }
          return new GenerateObservable(initialStateOrOptions, condition, iterate, resultSelectorOrObservable, scheduler);
      };
      GenerateObservable.prototype._subscribe = function (subscriber) {
          var state = this.initialState;
          if (this.scheduler) {
              return this.scheduler.schedule(GenerateObservable.dispatch, 0, {
                  subscriber: subscriber,
                  iterate: this.iterate,
                  condition: this.condition,
                  resultSelector: this.resultSelector,
                  state: state });
          }
          var _a = this, condition = _a.condition, resultSelector = _a.resultSelector, iterate = _a.iterate;
          do {
              if (condition) {
                  var conditionResult = void 0;
                  try {
                      conditionResult = condition(state);
                  }
                  catch (err) {
                      subscriber.error(err);
                      return;
                  }
                  if (!conditionResult) {
                      subscriber.complete();
                      break;
                  }
              }
              var value = void 0;
              try {
                  value = resultSelector(state);
              }
              catch (err) {
                  subscriber.error(err);
                  return;
              }
              subscriber.next(value);
              if (subscriber.closed) {
                  break;
              }
              try {
                  state = iterate(state);
              }
              catch (err) {
                  subscriber.error(err);
                  return;
              }
          } while (true);
      };
      GenerateObservable.dispatch = function (state) {
          var subscriber = state.subscriber, condition = state.condition;
          if (subscriber.closed) {
              return;
          }
          if (state.needIterate) {
              try {
                  state.state = state.iterate(state.state);
              }
              catch (err) {
                  subscriber.error(err);
                  return;
              }
          }
          else {
              state.needIterate = true;
          }
          if (condition) {
              var conditionResult = void 0;
              try {
                  conditionResult = condition(state.state);
              }
              catch (err) {
                  subscriber.error(err);
                  return;
              }
              if (!conditionResult) {
                  subscriber.complete();
                  return;
              }
              if (subscriber.closed) {
                  return;
              }
          }
          var value;
          try {
              value = state.resultSelector(state.state);
          }
          catch (err) {
              subscriber.error(err);
              return;
          }
          if (subscriber.closed) {
              return;
          }
          subscriber.next(value);
          if (subscriber.closed) {
              return;
          }
          return this.schedule(state);
      };
      return GenerateObservable;
  }(Observable_1.Observable));
  exports.GenerateObservable = GenerateObservable;
  //# sourceMappingURL=GenerateObservable.js.map

/***/ },
/* 244 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var IfObservable = (function (_super) {
      __extends(IfObservable, _super);
      function IfObservable(condition, thenSource, elseSource) {
          _super.call(this);
          this.condition = condition;
          this.thenSource = thenSource;
          this.elseSource = elseSource;
      }
      IfObservable.create = function (condition, thenSource, elseSource) {
          return new IfObservable(condition, thenSource, elseSource);
      };
      IfObservable.prototype._subscribe = function (subscriber) {
          var _a = this, condition = _a.condition, thenSource = _a.thenSource, elseSource = _a.elseSource;
          return new IfSubscriber(subscriber, condition, thenSource, elseSource);
      };
      return IfObservable;
  }(Observable_1.Observable));
  exports.IfObservable = IfObservable;
  var IfSubscriber = (function (_super) {
      __extends(IfSubscriber, _super);
      function IfSubscriber(destination, condition, thenSource, elseSource) {
          _super.call(this, destination);
          this.condition = condition;
          this.thenSource = thenSource;
          this.elseSource = elseSource;
          this.tryIf();
      }
      IfSubscriber.prototype.tryIf = function () {
          var _a = this, condition = _a.condition, thenSource = _a.thenSource, elseSource = _a.elseSource;
          var result;
          try {
              result = condition();
              var source = result ? thenSource : elseSource;
              if (source) {
                  this.add(subscribeToResult_1.subscribeToResult(this, source));
              }
              else {
                  this._complete();
              }
          }
          catch (err) {
              this._error(err);
          }
      };
      return IfSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=IfObservable.js.map

/***/ },
/* 245 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var isNumeric_1 = __webpack_require__(45);
  var Observable_1 = __webpack_require__(1);
  var async_1 = __webpack_require__(10);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var IntervalObservable = (function (_super) {
      __extends(IntervalObservable, _super);
      function IntervalObservable(period, scheduler) {
          if (period === void 0) { period = 0; }
          if (scheduler === void 0) { scheduler = async_1.async; }
          _super.call(this);
          this.period = period;
          this.scheduler = scheduler;
          if (!isNumeric_1.isNumeric(period) || period < 0) {
              this.period = 0;
          }
          if (!scheduler || typeof scheduler.schedule !== 'function') {
              this.scheduler = async_1.async;
          }
      }
      /**
       * Creates an Observable that emits sequential numbers every specified
       * interval of time, on a specified Scheduler.
       *
       * <span class="informal">Emits incremental numbers periodically in time.
       * </span>
       *
       * <img src="./img/interval.png" width="100%">
       *
       * `interval` returns an Observable that emits an infinite sequence of
       * ascending integers, with a constant interval of time of your choosing
       * between those emissions. The first emission is not sent immediately, but
       * only after the first period has passed. By default, this operator uses the
       * `async` Scheduler to provide a notion of time, but you may pass any
       * Scheduler to it.
       *
       * @example <caption>Emits ascending numbers, one every second (1000ms)</caption>
       * var numbers = Rx.Observable.interval(1000);
       * numbers.subscribe(x => console.log(x));
       *
       * @see {@link timer}
       * @see {@link delay}
       *
       * @param {number} [period=0] The interval size in milliseconds (by default)
       * or the time unit determined by the scheduler's clock.
       * @param {Scheduler} [scheduler=async] The Scheduler to use for scheduling
       * the emission of values, and providing a notion of "time".
       * @return {Observable} An Observable that emits a sequential number each time
       * interval.
       * @static true
       * @name interval
       * @owner Observable
       */
      IntervalObservable.create = function (period, scheduler) {
          if (period === void 0) { period = 0; }
          if (scheduler === void 0) { scheduler = async_1.async; }
          return new IntervalObservable(period, scheduler);
      };
      IntervalObservable.dispatch = function (state) {
          var index = state.index, subscriber = state.subscriber, period = state.period;
          subscriber.next(index);
          if (subscriber.closed) {
              return;
          }
          state.index += 1;
          this.schedule(state, period);
      };
      IntervalObservable.prototype._subscribe = function (subscriber) {
          var index = 0;
          var period = this.period;
          var scheduler = this.scheduler;
          subscriber.add(scheduler.schedule(IntervalObservable.dispatch, period, {
              index: index, subscriber: subscriber, period: period
          }));
      };
      return IntervalObservable;
  }(Observable_1.Observable));
  exports.IntervalObservable = IntervalObservable;
  //# sourceMappingURL=IntervalObservable.js.map

/***/ },
/* 246 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var root_1 = __webpack_require__(9);
  var Observable_1 = __webpack_require__(1);
  var iterator_1 = __webpack_require__(23);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var IteratorObservable = (function (_super) {
      __extends(IteratorObservable, _super);
      function IteratorObservable(iterator, scheduler) {
          _super.call(this);
          this.scheduler = scheduler;
          if (iterator == null) {
              throw new Error('iterator cannot be null.');
          }
          this.iterator = getIterator(iterator);
      }
      IteratorObservable.create = function (iterator, scheduler) {
          return new IteratorObservable(iterator, scheduler);
      };
      IteratorObservable.dispatch = function (state) {
          var index = state.index, hasError = state.hasError, iterator = state.iterator, subscriber = state.subscriber;
          if (hasError) {
              subscriber.error(state.error);
              return;
          }
          var result = iterator.next();
          if (result.done) {
              subscriber.complete();
              return;
          }
          subscriber.next(result.value);
          state.index = index + 1;
          if (subscriber.closed) {
              return;
          }
          this.schedule(state);
      };
      IteratorObservable.prototype._subscribe = function (subscriber) {
          var index = 0;
          var _a = this, iterator = _a.iterator, scheduler = _a.scheduler;
          if (scheduler) {
              return scheduler.schedule(IteratorObservable.dispatch, 0, {
                  index: index, iterator: iterator, subscriber: subscriber
              });
          }
          else {
              do {
                  var result = iterator.next();
                  if (result.done) {
                      subscriber.complete();
                      break;
                  }
                  else {
                      subscriber.next(result.value);
                  }
                  if (subscriber.closed) {
                      break;
                  }
              } while (true);
          }
      };
      return IteratorObservable;
  }(Observable_1.Observable));
  exports.IteratorObservable = IteratorObservable;
  var StringIterator = (function () {
      function StringIterator(str, idx, len) {
          if (idx === void 0) { idx = 0; }
          if (len === void 0) { len = str.length; }
          this.str = str;
          this.idx = idx;
          this.len = len;
      }
      StringIterator.prototype[iterator_1.$$iterator] = function () { return (this); };
      StringIterator.prototype.next = function () {
          return this.idx < this.len ? {
              done: false,
              value: this.str.charAt(this.idx++)
          } : {
              done: true,
              value: undefined
          };
      };
      return StringIterator;
  }());
  var ArrayIterator = (function () {
      function ArrayIterator(arr, idx, len) {
          if (idx === void 0) { idx = 0; }
          if (len === void 0) { len = toLength(arr); }
          this.arr = arr;
          this.idx = idx;
          this.len = len;
      }
      ArrayIterator.prototype[iterator_1.$$iterator] = function () { return this; };
      ArrayIterator.prototype.next = function () {
          return this.idx < this.len ? {
              done: false,
              value: this.arr[this.idx++]
          } : {
              done: true,
              value: undefined
          };
      };
      return ArrayIterator;
  }());
  function getIterator(obj) {
      var i = obj[iterator_1.$$iterator];
      if (!i && typeof obj === 'string') {
          return new StringIterator(obj);
      }
      if (!i && obj.length !== undefined) {
          return new ArrayIterator(obj);
      }
      if (!i) {
          throw new TypeError('object is not iterable');
      }
      return obj[iterator_1.$$iterator]();
  }
  var maxSafeInteger = Math.pow(2, 53) - 1;
  function toLength(o) {
      var len = +o.length;
      if (isNaN(len)) {
          return 0;
      }
      if (len === 0 || !numberIsFinite(len)) {
          return len;
      }
      len = sign(len) * Math.floor(Math.abs(len));
      if (len <= 0) {
          return 0;
      }
      if (len > maxSafeInteger) {
          return maxSafeInteger;
      }
      return len;
  }
  function numberIsFinite(value) {
      return typeof value === 'number' && root_1.root.isFinite(value);
  }
  function sign(value) {
      var valueAsNumber = +value;
      if (valueAsNumber === 0) {
          return valueAsNumber;
      }
      if (isNaN(valueAsNumber)) {
          return valueAsNumber;
      }
      return valueAsNumber < 0 ? -1 : 1;
  }
  //# sourceMappingURL=IteratorObservable.js.map

/***/ },
/* 247 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var noop_1 = __webpack_require__(78);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var NeverObservable = (function (_super) {
      __extends(NeverObservable, _super);
      function NeverObservable() {
          _super.call(this);
      }
      /**
       * Creates an Observable that emits no items to the Observer.
       *
       * <span class="informal">An Observable that never emits anything.</span>
       *
       * <img src="./img/never.png" width="100%">
       *
       * This static operator is useful for creating a simple Observable that emits
       * neither values nor errors nor the completion notification. It can be used
       * for testing purposes or for composing with other Observables. Please not
       * that by never emitting a complete notification, this Observable keeps the
       * subscription from being disposed automatically. Subscriptions need to be
       * manually disposed.
       *
       * @example <caption>Emit the number 7, then never emit anything else (not even complete).</caption>
       * function info() {
       *   console.log('Will not be called');
       * }
       * var result = Rx.Observable.never().startWith(7);
       * result.subscribe(x => console.log(x), info, info);
       *
       * @see {@link create}
       * @see {@link empty}
       * @see {@link of}
       * @see {@link throw}
       *
       * @return {Observable} A "never" Observable: never emits anything.
       * @static true
       * @name never
       * @owner Observable
       */
      NeverObservable.create = function () {
          return new NeverObservable();
      };
      NeverObservable.prototype._subscribe = function (subscriber) {
          noop_1.noop();
      };
      return NeverObservable;
  }(Observable_1.Observable));
  exports.NeverObservable = NeverObservable;
  //# sourceMappingURL=NeverObservable.js.map

/***/ },
/* 248 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  function dispatch(state) {
      var obj = state.obj, keys = state.keys, length = state.length, index = state.index, subscriber = state.subscriber;
      if (index === length) {
          subscriber.complete();
          return;
      }
      var key = keys[index];
      subscriber.next([key, obj[key]]);
      state.index = index + 1;
      this.schedule(state);
  }
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var PairsObservable = (function (_super) {
      __extends(PairsObservable, _super);
      function PairsObservable(obj, scheduler) {
          _super.call(this);
          this.obj = obj;
          this.scheduler = scheduler;
          this.keys = Object.keys(obj);
      }
      /**
       * Convert an object into an observable sequence of [key, value] pairs
       * using an optional Scheduler to enumerate the object.
       *
       * @example <caption>Converts a javascript object to an Observable</caption>
       * var obj = {
       *   foo: 42,
       *   bar: 56,
       *   baz: 78
       * };
       *
       * var source = Rx.Observable.pairs(obj);
       *
       * var subscription = source.subscribe(
       *   function (x) {
       *     console.log('Next: %s', x);
       *   },
       *   function (err) {
       *     console.log('Error: %s', err);
       *   },
       *   function () {
       *     console.log('Completed');
       *   });
       *
       * @param {Object} obj The object to inspect and turn into an
       * Observable sequence.
       * @param {Scheduler} [scheduler] An optional Scheduler to run the
       * enumeration of the input sequence on.
       * @returns {(Observable<Array<string | T>>)} An observable sequence of
       * [key, value] pairs from the object.
       */
      PairsObservable.create = function (obj, scheduler) {
          return new PairsObservable(obj, scheduler);
      };
      PairsObservable.prototype._subscribe = function (subscriber) {
          var _a = this, keys = _a.keys, scheduler = _a.scheduler;
          var length = keys.length;
          if (scheduler) {
              return scheduler.schedule(dispatch, 0, {
                  obj: this.obj, keys: keys, length: length, index: 0, subscriber: subscriber
              });
          }
          else {
              for (var idx = 0; idx < length; idx++) {
                  var key = keys[idx];
                  subscriber.next([key, this.obj[key]]);
              }
              subscriber.complete();
          }
      };
      return PairsObservable;
  }(Observable_1.Observable));
  exports.PairsObservable = PairsObservable;
  //# sourceMappingURL=PairsObservable.js.map

/***/ },
/* 249 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var RangeObservable = (function (_super) {
      __extends(RangeObservable, _super);
      function RangeObservable(start, count, scheduler) {
          _super.call(this);
          this.start = start;
          this._count = count;
          this.scheduler = scheduler;
      }
      /**
       * Creates an Observable that emits a sequence of numbers within a specified
       * range.
       *
       * <span class="informal">Emits a sequence of numbers in a range.</span>
       *
       * <img src="./img/range.png" width="100%">
       *
       * `range` operator emits a range of sequential integers, in order, where you
       * select the `start` of the range and its `length`. By default, uses no
       * Scheduler and just delivers the notifications synchronously, but may use
       * an optional Scheduler to regulate those deliveries.
       *
       * @example <caption>Emits the numbers 1 to 10</caption>
       * var numbers = Rx.Observable.range(1, 10);
       * numbers.subscribe(x => console.log(x));
       *
       * @see {@link timer}
       * @see {@link interval}
       *
       * @param {number} [start=0] The value of the first integer in the sequence.
       * @param {number} [count=0] The number of sequential integers to generate.
       * @param {Scheduler} [scheduler] A {@link Scheduler} to use for scheduling
       * the emissions of the notifications.
       * @return {Observable} An Observable of numbers that emits a finite range of
       * sequential integers.
       * @static true
       * @name range
       * @owner Observable
       */
      RangeObservable.create = function (start, count, scheduler) {
          if (start === void 0) { start = 0; }
          if (count === void 0) { count = 0; }
          return new RangeObservable(start, count, scheduler);
      };
      RangeObservable.dispatch = function (state) {
          var start = state.start, index = state.index, count = state.count, subscriber = state.subscriber;
          if (index >= count) {
              subscriber.complete();
              return;
          }
          subscriber.next(start);
          if (subscriber.closed) {
              return;
          }
          state.index = index + 1;
          state.start = start + 1;
          this.schedule(state);
      };
      RangeObservable.prototype._subscribe = function (subscriber) {
          var index = 0;
          var start = this.start;
          var count = this._count;
          var scheduler = this.scheduler;
          if (scheduler) {
              return scheduler.schedule(RangeObservable.dispatch, 0, {
                  index: index, count: count, start: start, subscriber: subscriber
              });
          }
          else {
              do {
                  if (index++ >= count) {
                      subscriber.complete();
                      break;
                  }
                  subscriber.next(start++);
                  if (subscriber.closed) {
                      break;
                  }
              } while (true);
          }
      };
      return RangeObservable;
  }(Observable_1.Observable));
  exports.RangeObservable = RangeObservable;
  //# sourceMappingURL=RangeObservable.js.map

/***/ },
/* 250 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var asap_1 = __webpack_require__(70);
  var isNumeric_1 = __webpack_require__(45);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var SubscribeOnObservable = (function (_super) {
      __extends(SubscribeOnObservable, _super);
      function SubscribeOnObservable(source, delayTime, scheduler) {
          if (delayTime === void 0) { delayTime = 0; }
          if (scheduler === void 0) { scheduler = asap_1.asap; }
          _super.call(this);
          this.source = source;
          this.delayTime = delayTime;
          this.scheduler = scheduler;
          if (!isNumeric_1.isNumeric(delayTime) || delayTime < 0) {
              this.delayTime = 0;
          }
          if (!scheduler || typeof scheduler.schedule !== 'function') {
              this.scheduler = asap_1.asap;
          }
      }
      SubscribeOnObservable.create = function (source, delay, scheduler) {
          if (delay === void 0) { delay = 0; }
          if (scheduler === void 0) { scheduler = asap_1.asap; }
          return new SubscribeOnObservable(source, delay, scheduler);
      };
      SubscribeOnObservable.dispatch = function (arg) {
          var source = arg.source, subscriber = arg.subscriber;
          return source.subscribe(subscriber);
      };
      SubscribeOnObservable.prototype._subscribe = function (subscriber) {
          var delay = this.delayTime;
          var source = this.source;
          var scheduler = this.scheduler;
          return scheduler.schedule(SubscribeOnObservable.dispatch, delay, {
              source: source, subscriber: subscriber
          });
      };
      return SubscribeOnObservable;
  }(Observable_1.Observable));
  exports.SubscribeOnObservable = SubscribeOnObservable;
  //# sourceMappingURL=SubscribeOnObservable.js.map

/***/ },
/* 251 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var isNumeric_1 = __webpack_require__(45);
  var Observable_1 = __webpack_require__(1);
  var async_1 = __webpack_require__(10);
  var isScheduler_1 = __webpack_require__(15);
  var isDate_1 = __webpack_require__(31);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var TimerObservable = (function (_super) {
      __extends(TimerObservable, _super);
      function TimerObservable(dueTime, period, scheduler) {
          if (dueTime === void 0) { dueTime = 0; }
          _super.call(this);
          this.period = -1;
          this.dueTime = 0;
          if (isNumeric_1.isNumeric(period)) {
              this.period = Number(period) < 1 && 1 || Number(period);
          }
          else if (isScheduler_1.isScheduler(period)) {
              scheduler = period;
          }
          if (!isScheduler_1.isScheduler(scheduler)) {
              scheduler = async_1.async;
          }
          this.scheduler = scheduler;
          this.dueTime = isDate_1.isDate(dueTime) ?
              (+dueTime - this.scheduler.now()) :
              dueTime;
      }
      /**
       * Creates an Observable that starts emitting after an `initialDelay` and
       * emits ever increasing numbers after each `period` of time thereafter.
       *
       * <span class="informal">Its like {@link interval}, but you can specify when
       * should the emissions start.</span>
       *
       * <img src="./img/timer.png" width="100%">
       *
       * `timer` returns an Observable that emits an infinite sequence of ascending
       * integers, with a constant interval of time, `period` of your choosing
       * between those emissions. The first emission happens after the specified
       * `initialDelay`. The initial delay may be a {@link Date}. By default, this
       * operator uses the `async` Scheduler to provide a notion of time, but you
       * may pass any Scheduler to it. If `period` is not specified, the output
       * Observable emits only one value, `0`. Otherwise, it emits an infinite
       * sequence.
       *
       * @example <caption>Emits ascending numbers, one every second (1000ms), starting after 3 seconds</caption>
       * var numbers = Rx.Observable.timer(3000, 1000);
       * numbers.subscribe(x => console.log(x));
       *
       * @example <caption>Emits one number after five seconds</caption>
       * var numbers = Rx.Observable.timer(5000);
       * numbers.subscribe(x => console.log(x));
       *
       * @see {@link interval}
       * @see {@link delay}
       *
       * @param {number|Date} initialDelay The initial delay time to wait before
       * emitting the first value of `0`.
       * @param {number} [period] The period of time between emissions of the
       * subsequent numbers.
       * @param {Scheduler} [scheduler=async] The Scheduler to use for scheduling
       * the emission of values, and providing a notion of "time".
       * @return {Observable} An Observable that emits a `0` after the
       * `initialDelay` and ever increasing numbers after each `period` of time
       * thereafter.
       * @static true
       * @name timer
       * @owner Observable
       */
      TimerObservable.create = function (initialDelay, period, scheduler) {
          if (initialDelay === void 0) { initialDelay = 0; }
          return new TimerObservable(initialDelay, period, scheduler);
      };
      TimerObservable.dispatch = function (state) {
          var index = state.index, period = state.period, subscriber = state.subscriber;
          var action = this;
          subscriber.next(index);
          if (subscriber.closed) {
              return;
          }
          else if (period === -1) {
              return subscriber.complete();
          }
          state.index = index + 1;
          action.schedule(state, period);
      };
      TimerObservable.prototype._subscribe = function (subscriber) {
          var index = 0;
          var _a = this, period = _a.period, dueTime = _a.dueTime, scheduler = _a.scheduler;
          return scheduler.schedule(TimerObservable.dispatch, dueTime, {
              index: index, period: period, subscriber: subscriber
          });
      };
      return TimerObservable;
  }(Observable_1.Observable));
  exports.TimerObservable = TimerObservable;
  //# sourceMappingURL=TimerObservable.js.map

/***/ },
/* 252 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var UsingObservable = (function (_super) {
      __extends(UsingObservable, _super);
      function UsingObservable(resourceFactory, observableFactory) {
          _super.call(this);
          this.resourceFactory = resourceFactory;
          this.observableFactory = observableFactory;
      }
      UsingObservable.create = function (resourceFactory, observableFactory) {
          return new UsingObservable(resourceFactory, observableFactory);
      };
      UsingObservable.prototype._subscribe = function (subscriber) {
          var _a = this, resourceFactory = _a.resourceFactory, observableFactory = _a.observableFactory;
          var resource;
          try {
              resource = resourceFactory();
              return new UsingSubscriber(subscriber, resource, observableFactory);
          }
          catch (err) {
              subscriber.error(err);
          }
      };
      return UsingObservable;
  }(Observable_1.Observable));
  exports.UsingObservable = UsingObservable;
  var UsingSubscriber = (function (_super) {
      __extends(UsingSubscriber, _super);
      function UsingSubscriber(destination, resource, observableFactory) {
          _super.call(this, destination);
          this.resource = resource;
          this.observableFactory = observableFactory;
          destination.add(resource);
          this.tryUse();
      }
      UsingSubscriber.prototype.tryUse = function () {
          try {
              var source = this.observableFactory.call(this, this.resource);
              if (source) {
                  this.add(subscribeToResult_1.subscribeToResult(this, source));
              }
          }
          catch (err) {
              this._error(err);
          }
      };
      return UsingSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=UsingObservable.js.map

/***/ },
/* 253 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var BoundCallbackObservable_1 = __webpack_require__(236);
  exports.bindCallback = BoundCallbackObservable_1.BoundCallbackObservable.create;
  //# sourceMappingURL=bindCallback.js.map

/***/ },
/* 254 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var BoundNodeCallbackObservable_1 = __webpack_require__(237);
  exports.bindNodeCallback = BoundNodeCallbackObservable_1.BoundNodeCallbackObservable.create;
  //# sourceMappingURL=bindNodeCallback.js.map

/***/ },
/* 255 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var isScheduler_1 = __webpack_require__(15);
  var isArray_1 = __webpack_require__(11);
  var ArrayObservable_1 = __webpack_require__(12);
  var combineLatest_1 = __webpack_require__(37);
  /* tslint:enable:max-line-length */
  /**
   * Combines multiple Observables to create an Observable whose values are
   * calculated from the latest values of each of its input Observables.
   *
   * <span class="informal">Whenever any input Observable emits a value, it
   * computes a formula using the latest values from all the inputs, then emits
   * the output of that formula.</span>
   *
   * <img src="./img/combineLatest.png" width="100%">
   *
   * `combineLatest` combines the values from all the Observables passed as
   * arguments. This is done by subscribing to each Observable, in order, and
   * collecting an array of each of the most recent values any time any of the
   * input Observables emits, then either taking that array and passing it as
   * arguments to an optional `project` function and emitting the return value of
   * that, or just emitting the array of recent values directly if there is no
   * `project` function.
   *
   * @example <caption>Dynamically calculate the Body-Mass Index from an Observable of weight and one for height</caption>
   * var weight = Rx.Observable.of(70, 72, 76, 79, 75);
   * var height = Rx.Observable.of(1.76, 1.77, 1.78);
   * var bmi = Rx.Observable.combineLatest(weight, height, (w, h) => w / (h * h));
   * bmi.subscribe(x => console.log('BMI is ' + x));
   *
   * @see {@link combineAll}
   * @see {@link merge}
   * @see {@link withLatestFrom}
   *
   * @param {Observable} observable1 An input Observable to combine with the
   * source Observable.
   * @param {Observable} observable2 An input Observable to combine with the
   * source Observable. More than one input Observables may be given as argument.
   * @param {function} [project] An optional function to project the values from
   * the combined latest values into a new value on the output Observable.
   * @param {Scheduler} [scheduler=null] The Scheduler to use for subscribing to
   * each input Observable.
   * @return {Observable} An Observable of projected values from the most recent
   * values from each input Observable, or an array of the most recent values from
   * each input Observable.
   * @static true
   * @name combineLatest
   * @owner Observable
   */
  function combineLatest() {
      var observables = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          observables[_i - 0] = arguments[_i];
      }
      var project = null;
      var scheduler = null;
      if (isScheduler_1.isScheduler(observables[observables.length - 1])) {
          scheduler = observables.pop();
      }
      if (typeof observables[observables.length - 1] === 'function') {
          project = observables.pop();
      }
      // if the first and only other argument besides the resultSelector is an array
      // assume it's been called with `combineLatest([obs1, obs2, obs3], project)`
      if (observables.length === 1 && isArray_1.isArray(observables[0])) {
          observables = observables[0];
      }
      return new ArrayObservable_1.ArrayObservable(observables, scheduler).lift(new combineLatest_1.CombineLatestOperator(project));
  }
  exports.combineLatest = combineLatest;
  //# sourceMappingURL=combineLatest.js.map

/***/ },
/* 256 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var concat_1 = __webpack_require__(38);
  exports.concat = concat_1.concatStatic;
  //# sourceMappingURL=concat.js.map

/***/ },
/* 257 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var DeferObservable_1 = __webpack_require__(238);
  exports.defer = DeferObservable_1.DeferObservable.create;
  //# sourceMappingURL=defer.js.map

/***/ },
/* 258 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var Subscriber_1 = __webpack_require__(2);
  var Observable_1 = __webpack_require__(1);
  var Subscription_1 = __webpack_require__(6);
  var root_1 = __webpack_require__(9);
  var ReplaySubject_1 = __webpack_require__(35);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var assign_1 = __webpack_require__(376);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @extends {Ignored}
   * @hide true
   */
  var WebSocketSubject = (function (_super) {
      __extends(WebSocketSubject, _super);
      function WebSocketSubject(urlConfigOrSource, destination) {
          if (urlConfigOrSource instanceof Observable_1.Observable) {
              _super.call(this, destination, urlConfigOrSource);
          }
          else {
              _super.call(this);
              this.WebSocketCtor = root_1.root.WebSocket;
              this._output = new Subject_1.Subject();
              if (typeof urlConfigOrSource === 'string') {
                  this.url = urlConfigOrSource;
              }
              else {
                  // WARNING: config object could override important members here.
                  assign_1.assign(this, urlConfigOrSource);
              }
              if (!this.WebSocketCtor) {
                  throw new Error('no WebSocket constructor can be found');
              }
              this.destination = new ReplaySubject_1.ReplaySubject();
          }
      }
      WebSocketSubject.prototype.resultSelector = function (e) {
          return JSON.parse(e.data);
      };
      /**
       * @param urlConfigOrSource
       * @return {WebSocketSubject}
       * @static true
       * @name webSocket
       * @owner Observable
       */
      WebSocketSubject.create = function (urlConfigOrSource) {
          return new WebSocketSubject(urlConfigOrSource);
      };
      WebSocketSubject.prototype.lift = function (operator) {
          var sock = new WebSocketSubject(this, this.destination);
          sock.operator = operator;
          return sock;
      };
      WebSocketSubject.prototype._resetState = function () {
          this.socket = null;
          if (!this.source) {
              this.destination = new ReplaySubject_1.ReplaySubject();
          }
          this._output = new Subject_1.Subject();
      };
      // TODO: factor this out to be a proper Operator/Subscriber implementation and eliminate closures
      WebSocketSubject.prototype.multiplex = function (subMsg, unsubMsg, messageFilter) {
          var self = this;
          return new Observable_1.Observable(function (observer) {
              var result = tryCatch_1.tryCatch(subMsg)();
              if (result === errorObject_1.errorObject) {
                  observer.error(errorObject_1.errorObject.e);
              }
              else {
                  self.next(result);
              }
              var subscription = self.subscribe(function (x) {
                  var result = tryCatch_1.tryCatch(messageFilter)(x);
                  if (result === errorObject_1.errorObject) {
                      observer.error(errorObject_1.errorObject.e);
                  }
                  else if (result) {
                      observer.next(x);
                  }
              }, function (err) { return observer.error(err); }, function () { return observer.complete(); });
              return function () {
                  var result = tryCatch_1.tryCatch(unsubMsg)();
                  if (result === errorObject_1.errorObject) {
                      observer.error(errorObject_1.errorObject.e);
                  }
                  else {
                      self.next(result);
                  }
                  subscription.unsubscribe();
              };
          });
      };
      WebSocketSubject.prototype._connectSocket = function () {
          var _this = this;
          var WebSocketCtor = this.WebSocketCtor;
          var observer = this._output;
          var socket = null;
          try {
              socket = this.protocol ?
                  new WebSocketCtor(this.url, this.protocol) :
                  new WebSocketCtor(this.url);
              this.socket = socket;
          }
          catch (e) {
              observer.error(e);
              return;
          }
          var subscription = new Subscription_1.Subscription(function () {
              _this.socket = null;
              if (socket && socket.readyState === 1) {
                  socket.close();
              }
          });
          socket.onopen = function (e) {
              var openObserver = _this.openObserver;
              if (openObserver) {
                  openObserver.next(e);
              }
              var queue = _this.destination;
              _this.destination = Subscriber_1.Subscriber.create(function (x) { return socket.readyState === 1 && socket.send(x); }, function (e) {
                  var closingObserver = _this.closingObserver;
                  if (closingObserver) {
                      closingObserver.next(undefined);
                  }
                  if (e && e.code) {
                      socket.close(e.code, e.reason);
                  }
                  else {
                      observer.error(new TypeError('WebSocketSubject.error must be called with an object with an error code, ' +
                          'and an optional reason: { code: number, reason: string }'));
                  }
                  _this._resetState();
              }, function () {
                  var closingObserver = _this.closingObserver;
                  if (closingObserver) {
                      closingObserver.next(undefined);
                  }
                  socket.close();
                  _this._resetState();
              });
              if (queue && queue instanceof ReplaySubject_1.ReplaySubject) {
                  subscription.add(queue.subscribe(_this.destination));
              }
          };
          socket.onerror = function (e) {
              _this._resetState();
              observer.error(e);
          };
          socket.onclose = function (e) {
              _this._resetState();
              var closeObserver = _this.closeObserver;
              if (closeObserver) {
                  closeObserver.next(e);
              }
              if (e.wasClean) {
                  observer.complete();
              }
              else {
                  observer.error(e);
              }
          };
          socket.onmessage = function (e) {
              var result = tryCatch_1.tryCatch(_this.resultSelector)(e);
              if (result === errorObject_1.errorObject) {
                  observer.error(errorObject_1.errorObject.e);
              }
              else {
                  observer.next(result);
              }
          };
      };
      WebSocketSubject.prototype._subscribe = function (subscriber) {
          var _this = this;
          var source = this.source;
          if (source) {
              return source.subscribe(subscriber);
          }
          if (!this.socket) {
              this._connectSocket();
          }
          var subscription = new Subscription_1.Subscription();
          subscription.add(this._output.subscribe(subscriber));
          subscription.add(function () {
              var socket = _this.socket;
              if (_this._output.observers.length === 0 && socket && socket.readyState === 1) {
                  socket.close();
              }
              _this._resetState();
          });
          return subscription;
      };
      WebSocketSubject.prototype.unsubscribe = function () {
          var _a = this, source = _a.source, socket = _a.socket;
          if (socket && socket.readyState === 1) {
              socket.close();
              this._resetState();
          }
          _super.prototype.unsubscribe.call(this);
          if (!source) {
              this.destination = new ReplaySubject_1.ReplaySubject();
          }
      };
      return WebSocketSubject;
  }(Subject_1.AnonymousSubject));
  exports.WebSocketSubject = WebSocketSubject;
  //# sourceMappingURL=WebSocketSubject.js.map

/***/ },
/* 259 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var AjaxObservable_1 = __webpack_require__(57);
  exports.ajax = AjaxObservable_1.AjaxObservable.create;
  //# sourceMappingURL=ajax.js.map

/***/ },
/* 260 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var WebSocketSubject_1 = __webpack_require__(258);
  exports.webSocket = WebSocketSubject_1.WebSocketSubject.create;
  //# sourceMappingURL=webSocket.js.map

/***/ },
/* 261 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var EmptyObservable_1 = __webpack_require__(14);
  exports.empty = EmptyObservable_1.EmptyObservable.create;
  //# sourceMappingURL=empty.js.map

/***/ },
/* 262 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ForkJoinObservable_1 = __webpack_require__(240);
  exports.forkJoin = ForkJoinObservable_1.ForkJoinObservable.create;
  //# sourceMappingURL=forkJoin.js.map

/***/ },
/* 263 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var FromObservable_1 = __webpack_require__(55);
  exports.from = FromObservable_1.FromObservable.create;
  //# sourceMappingURL=from.js.map

/***/ },
/* 264 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var FromEventObservable_1 = __webpack_require__(241);
  exports.fromEvent = FromEventObservable_1.FromEventObservable.create;
  //# sourceMappingURL=fromEvent.js.map

/***/ },
/* 265 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var FromEventPatternObservable_1 = __webpack_require__(242);
  exports.fromEventPattern = FromEventPatternObservable_1.FromEventPatternObservable.create;
  //# sourceMappingURL=fromEventPattern.js.map

/***/ },
/* 266 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var PromiseObservable_1 = __webpack_require__(56);
  exports.fromPromise = PromiseObservable_1.PromiseObservable.create;
  //# sourceMappingURL=fromPromise.js.map

/***/ },
/* 267 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var IfObservable_1 = __webpack_require__(244);
  exports._if = IfObservable_1.IfObservable.create;
  //# sourceMappingURL=if.js.map

/***/ },
/* 268 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var IntervalObservable_1 = __webpack_require__(245);
  exports.interval = IntervalObservable_1.IntervalObservable.create;
  //# sourceMappingURL=interval.js.map

/***/ },
/* 269 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var merge_1 = __webpack_require__(62);
  exports.merge = merge_1.mergeStatic;
  //# sourceMappingURL=merge.js.map

/***/ },
/* 270 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var NeverObservable_1 = __webpack_require__(247);
  exports.never = NeverObservable_1.NeverObservable.create;
  //# sourceMappingURL=never.js.map

/***/ },
/* 271 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ArrayObservable_1 = __webpack_require__(12);
  exports.of = ArrayObservable_1.ArrayObservable.of;
  //# sourceMappingURL=of.js.map

/***/ },
/* 272 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var PairsObservable_1 = __webpack_require__(248);
  exports.pairs = PairsObservable_1.PairsObservable.create;
  //# sourceMappingURL=pairs.js.map

/***/ },
/* 273 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var RangeObservable_1 = __webpack_require__(249);
  exports.range = RangeObservable_1.RangeObservable.create;
  //# sourceMappingURL=range.js.map

/***/ },
/* 274 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ErrorObservable_1 = __webpack_require__(239);
  exports._throw = ErrorObservable_1.ErrorObservable.create;
  //# sourceMappingURL=throw.js.map

/***/ },
/* 275 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var TimerObservable_1 = __webpack_require__(251);
  exports.timer = TimerObservable_1.TimerObservable.create;
  //# sourceMappingURL=timer.js.map

/***/ },
/* 276 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var UsingObservable_1 = __webpack_require__(252);
  exports.using = UsingObservable_1.UsingObservable.create;
  //# sourceMappingURL=using.js.map

/***/ },
/* 277 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var zip_1 = __webpack_require__(42);
  exports.zip = zip_1.zipStatic;
  //# sourceMappingURL=zip.js.map

/***/ },
/* 278 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Ignores source values for a duration determined by another Observable, then
   * emits the most recent value from the source Observable, then repeats this
   * process.
   *
   * <span class="informal">It's like {@link auditTime}, but the silencing
   * duration is determined by a second Observable.</span>
   *
   * <img src="./img/audit.png" width="100%">
   *
   * `audit` is similar to `throttle`, but emits the last value from the silenced
   * time window, instead of the first value. `audit` emits the most recent value
   * from the source Observable on the output Observable as soon as its internal
   * timer becomes disabled, and ignores source values while the timer is enabled.
   * Initially, the timer is disabled. As soon as the first source value arrives,
   * the timer is enabled by calling the `durationSelector` function with the
   * source value, which returns the "duration" Observable. When the duration
   * Observable emits a value or completes, the timer is disabled, then the most
   * recent source value is emitted on the output Observable, and this process
   * repeats for the next source value.
   *
   * @example <caption>Emit clicks at a rate of at most one click per second</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.audit(ev => Rx.Observable.interval(1000));
   * result.subscribe(x => console.log(x));
   *
   * @see {@link auditTime}
   * @see {@link debounce}
   * @see {@link delayWhen}
   * @see {@link sample}
   * @see {@link throttle}
   *
   * @param {function(value: T): Observable|Promise} durationSelector A function
   * that receives a value from the source Observable, for computing the silencing
   * duration, returned as an Observable or a Promise.
   * @return {Observable<T>} An Observable that performs rate-limiting of
   * emissions from the source Observable.
   * @method audit
   * @owner Observable
   */
  function audit(durationSelector) {
      return this.lift(new AuditOperator(durationSelector));
  }
  exports.audit = audit;
  var AuditOperator = (function () {
      function AuditOperator(durationSelector) {
          this.durationSelector = durationSelector;
      }
      AuditOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new AuditSubscriber(subscriber, this.durationSelector));
      };
      return AuditOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var AuditSubscriber = (function (_super) {
      __extends(AuditSubscriber, _super);
      function AuditSubscriber(destination, durationSelector) {
          _super.call(this, destination);
          this.durationSelector = durationSelector;
          this.hasValue = false;
      }
      AuditSubscriber.prototype._next = function (value) {
          this.value = value;
          this.hasValue = true;
          if (!this.throttled) {
              var duration = tryCatch_1.tryCatch(this.durationSelector)(value);
              if (duration === errorObject_1.errorObject) {
                  this.destination.error(errorObject_1.errorObject.e);
              }
              else {
                  this.add(this.throttled = subscribeToResult_1.subscribeToResult(this, duration));
              }
          }
      };
      AuditSubscriber.prototype.clearThrottle = function () {
          var _a = this, value = _a.value, hasValue = _a.hasValue, throttled = _a.throttled;
          if (throttled) {
              this.remove(throttled);
              this.throttled = null;
              throttled.unsubscribe();
          }
          if (hasValue) {
              this.value = null;
              this.hasValue = false;
              this.destination.next(value);
          }
      };
      AuditSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex) {
          this.clearThrottle();
      };
      AuditSubscriber.prototype.notifyComplete = function () {
          this.clearThrottle();
      };
      return AuditSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=audit.js.map

/***/ },
/* 279 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var async_1 = __webpack_require__(10);
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Ignores source values for `duration` milliseconds, then emits the most recent
   * value from the source Observable, then repeats this process.
   *
   * <span class="informal">When it sees a source values, it ignores that plus
   * the next ones for `duration` milliseconds, and then it emits the most recent
   * value from the source.</span>
   *
   * <img src="./img/auditTime.png" width="100%">
   *
   * `auditTime` is similar to `throttleTime`, but emits the last value from the
   * silenced time window, instead of the first value. `auditTime` emits the most
   * recent value from the source Observable on the output Observable as soon as
   * its internal timer becomes disabled, and ignores source values while the
   * timer is enabled. Initially, the timer is disabled. As soon as the first
   * source value arrives, the timer is enabled. After `duration` milliseconds (or
   * the time unit determined internally by the optional `scheduler`) has passed,
   * the timer is disabled, then the most recent source value is emitted on the
   * output Observable, and this process repeats for the next source value.
   * Optionally takes a {@link Scheduler} for managing timers.
   *
   * @example <caption>Emit clicks at a rate of at most one click per second</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.auditTime(1000);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link audit}
   * @see {@link debounceTime}
   * @see {@link delay}
   * @see {@link sampleTime}
   * @see {@link throttleTime}
   *
   * @param {number} duration Time to wait before emitting the most recent source
   * value, measured in milliseconds or the time unit determined internally
   * by the optional `scheduler`.
   * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
   * managing the timers that handle the rate-limiting behavior.
   * @return {Observable<T>} An Observable that performs rate-limiting of
   * emissions from the source Observable.
   * @method auditTime
   * @owner Observable
   */
  function auditTime(duration, scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new AuditTimeOperator(duration, scheduler));
  }
  exports.auditTime = auditTime;
  var AuditTimeOperator = (function () {
      function AuditTimeOperator(duration, scheduler) {
          this.duration = duration;
          this.scheduler = scheduler;
      }
      AuditTimeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new AuditTimeSubscriber(subscriber, this.duration, this.scheduler));
      };
      return AuditTimeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var AuditTimeSubscriber = (function (_super) {
      __extends(AuditTimeSubscriber, _super);
      function AuditTimeSubscriber(destination, duration, scheduler) {
          _super.call(this, destination);
          this.duration = duration;
          this.scheduler = scheduler;
          this.hasValue = false;
      }
      AuditTimeSubscriber.prototype._next = function (value) {
          this.value = value;
          this.hasValue = true;
          if (!this.throttled) {
              this.add(this.throttled = this.scheduler.schedule(dispatchNext, this.duration, this));
          }
      };
      AuditTimeSubscriber.prototype.clearThrottle = function () {
          var _a = this, value = _a.value, hasValue = _a.hasValue, throttled = _a.throttled;
          if (throttled) {
              this.remove(throttled);
              this.throttled = null;
              throttled.unsubscribe();
          }
          if (hasValue) {
              this.value = null;
              this.hasValue = false;
              this.destination.next(value);
          }
      };
      return AuditTimeSubscriber;
  }(Subscriber_1.Subscriber));
  function dispatchNext(subscriber) {
      subscriber.clearThrottle();
  }
  //# sourceMappingURL=auditTime.js.map

/***/ },
/* 280 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Buffers the source Observable values until `closingNotifier` emits.
   *
   * <span class="informal">Collects values from the past as an array, and emits
   * that array only when another Observable emits.</span>
   *
   * <img src="./img/buffer.png" width="100%">
   *
   * Buffers the incoming Observable values until the given `closingNotifier`
   * Observable emits a value, at which point it emits the buffer on the output
   * Observable and starts a new buffer internally, awaiting the next time
   * `closingNotifier` emits.
   *
   * @example <caption>On every click, emit array of most recent interval events</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var interval = Rx.Observable.interval(1000);
   * var buffered = interval.buffer(clicks);
   * buffered.subscribe(x => console.log(x));
   *
   * @see {@link bufferCount}
   * @see {@link bufferTime}
   * @see {@link bufferToggle}
   * @see {@link bufferWhen}
   * @see {@link window}
   *
   * @param {Observable<any>} closingNotifier An Observable that signals the
   * buffer to be emitted on the output Observable.
   * @return {Observable<T[]>} An Observable of buffers, which are arrays of
   * values.
   * @method buffer
   * @owner Observable
   */
  function buffer(closingNotifier) {
      return this.lift(new BufferOperator(closingNotifier));
  }
  exports.buffer = buffer;
  var BufferOperator = (function () {
      function BufferOperator(closingNotifier) {
          this.closingNotifier = closingNotifier;
      }
      BufferOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new BufferSubscriber(subscriber, this.closingNotifier));
      };
      return BufferOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var BufferSubscriber = (function (_super) {
      __extends(BufferSubscriber, _super);
      function BufferSubscriber(destination, closingNotifier) {
          _super.call(this, destination);
          this.buffer = [];
          this.add(subscribeToResult_1.subscribeToResult(this, closingNotifier));
      }
      BufferSubscriber.prototype._next = function (value) {
          this.buffer.push(value);
      };
      BufferSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var buffer = this.buffer;
          this.buffer = [];
          this.destination.next(buffer);
      };
      return BufferSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=buffer.js.map

/***/ },
/* 281 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Buffers the source Observable values until the size hits the maximum
   * `bufferSize` given.
   *
   * <span class="informal">Collects values from the past as an array, and emits
   * that array only when its size reaches `bufferSize`.</span>
   *
   * <img src="./img/bufferCount.png" width="100%">
   *
   * Buffers a number of values from the source Observable by `bufferSize` then
   * emits the buffer and clears it, and starts a new buffer each
   * `startBufferEvery` values. If `startBufferEvery` is not provided or is
   * `null`, then new buffers are started immediately at the start of the source
   * and when each buffer closes and is emitted.
   *
   * @example <caption>Emit the last two click events as an array</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var buffered = clicks.bufferCount(2);
   * buffered.subscribe(x => console.log(x));
   *
   * @example <caption>On every click, emit the last two click events as an array</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var buffered = clicks.bufferCount(2, 1);
   * buffered.subscribe(x => console.log(x));
   *
   * @see {@link buffer}
   * @see {@link bufferTime}
   * @see {@link bufferToggle}
   * @see {@link bufferWhen}
   * @see {@link pairwise}
   * @see {@link windowCount}
   *
   * @param {number} bufferSize The maximum size of the buffer emitted.
   * @param {number} [startBufferEvery] Interval at which to start a new buffer.
   * For example if `startBufferEvery` is `2`, then a new buffer will be started
   * on every other value from the source. A new buffer is started at the
   * beginning of the source by default.
   * @return {Observable<T[]>} An Observable of arrays of buffered values.
   * @method bufferCount
   * @owner Observable
   */
  function bufferCount(bufferSize, startBufferEvery) {
      if (startBufferEvery === void 0) { startBufferEvery = null; }
      return this.lift(new BufferCountOperator(bufferSize, startBufferEvery));
  }
  exports.bufferCount = bufferCount;
  var BufferCountOperator = (function () {
      function BufferCountOperator(bufferSize, startBufferEvery) {
          this.bufferSize = bufferSize;
          this.startBufferEvery = startBufferEvery;
      }
      BufferCountOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new BufferCountSubscriber(subscriber, this.bufferSize, this.startBufferEvery));
      };
      return BufferCountOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var BufferCountSubscriber = (function (_super) {
      __extends(BufferCountSubscriber, _super);
      function BufferCountSubscriber(destination, bufferSize, startBufferEvery) {
          _super.call(this, destination);
          this.bufferSize = bufferSize;
          this.startBufferEvery = startBufferEvery;
          this.buffers = [[]];
          this.count = 0;
      }
      BufferCountSubscriber.prototype._next = function (value) {
          var count = (this.count += 1);
          var destination = this.destination;
          var bufferSize = this.bufferSize;
          var startBufferEvery = (this.startBufferEvery == null) ? bufferSize : this.startBufferEvery;
          var buffers = this.buffers;
          var len = buffers.length;
          var remove = -1;
          if (count % startBufferEvery === 0) {
              buffers.push([]);
          }
          for (var i = 0; i < len; i++) {
              var buffer = buffers[i];
              buffer.push(value);
              if (buffer.length === bufferSize) {
                  remove = i;
                  destination.next(buffer);
              }
          }
          if (remove !== -1) {
              buffers.splice(remove, 1);
          }
      };
      BufferCountSubscriber.prototype._complete = function () {
          var destination = this.destination;
          var buffers = this.buffers;
          while (buffers.length > 0) {
              var buffer = buffers.shift();
              if (buffer.length > 0) {
                  destination.next(buffer);
              }
          }
          _super.prototype._complete.call(this);
      };
      return BufferCountSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=bufferCount.js.map

/***/ },
/* 282 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var async_1 = __webpack_require__(10);
  var Subscriber_1 = __webpack_require__(2);
  var isScheduler_1 = __webpack_require__(15);
  /* tslint:disable:max-line-length */
  function bufferTime(bufferTimeSpan) {
      var length = arguments.length;
      var scheduler = async_1.async;
      if (isScheduler_1.isScheduler(arguments[arguments.length - 1])) {
          scheduler = arguments[arguments.length - 1];
          length--;
      }
      var bufferCreationInterval = null;
      if (length >= 2) {
          bufferCreationInterval = arguments[1];
      }
      var maxBufferSize = Number.POSITIVE_INFINITY;
      if (length >= 3) {
          maxBufferSize = arguments[2];
      }
      return this.lift(new BufferTimeOperator(bufferTimeSpan, bufferCreationInterval, maxBufferSize, scheduler));
  }
  exports.bufferTime = bufferTime;
  var BufferTimeOperator = (function () {
      function BufferTimeOperator(bufferTimeSpan, bufferCreationInterval, maxBufferSize, scheduler) {
          this.bufferTimeSpan = bufferTimeSpan;
          this.bufferCreationInterval = bufferCreationInterval;
          this.maxBufferSize = maxBufferSize;
          this.scheduler = scheduler;
      }
      BufferTimeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new BufferTimeSubscriber(subscriber, this.bufferTimeSpan, this.bufferCreationInterval, this.maxBufferSize, this.scheduler));
      };
      return BufferTimeOperator;
  }());
  var Context = (function () {
      function Context() {
          this.buffer = [];
      }
      return Context;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var BufferTimeSubscriber = (function (_super) {
      __extends(BufferTimeSubscriber, _super);
      function BufferTimeSubscriber(destination, bufferTimeSpan, bufferCreationInterval, maxBufferSize, scheduler) {
          _super.call(this, destination);
          this.bufferTimeSpan = bufferTimeSpan;
          this.bufferCreationInterval = bufferCreationInterval;
          this.maxBufferSize = maxBufferSize;
          this.scheduler = scheduler;
          this.contexts = [];
          var context = this.openContext();
          this.timespanOnly = bufferCreationInterval == null || bufferCreationInterval < 0;
          if (this.timespanOnly) {
              var timeSpanOnlyState = { subscriber: this, context: context, bufferTimeSpan: bufferTimeSpan };
              this.add(context.closeAction = scheduler.schedule(dispatchBufferTimeSpanOnly, bufferTimeSpan, timeSpanOnlyState));
          }
          else {
              var closeState = { subscriber: this, context: context };
              var creationState = { bufferTimeSpan: bufferTimeSpan, bufferCreationInterval: bufferCreationInterval, subscriber: this, scheduler: scheduler };
              this.add(context.closeAction = scheduler.schedule(dispatchBufferClose, bufferTimeSpan, closeState));
              this.add(scheduler.schedule(dispatchBufferCreation, bufferCreationInterval, creationState));
          }
      }
      BufferTimeSubscriber.prototype._next = function (value) {
          var contexts = this.contexts;
          var len = contexts.length;
          var filledBufferContext;
          for (var i = 0; i < len; i++) {
              var context = contexts[i];
              var buffer = context.buffer;
              buffer.push(value);
              if (buffer.length == this.maxBufferSize) {
                  filledBufferContext = context;
              }
          }
          if (filledBufferContext) {
              this.onBufferFull(filledBufferContext);
          }
      };
      BufferTimeSubscriber.prototype._error = function (err) {
          this.contexts.length = 0;
          _super.prototype._error.call(this, err);
      };
      BufferTimeSubscriber.prototype._complete = function () {
          var _a = this, contexts = _a.contexts, destination = _a.destination;
          while (contexts.length > 0) {
              var context = contexts.shift();
              destination.next(context.buffer);
          }
          _super.prototype._complete.call(this);
      };
      BufferTimeSubscriber.prototype._unsubscribe = function () {
          this.contexts = null;
      };
      BufferTimeSubscriber.prototype.onBufferFull = function (context) {
          this.closeContext(context);
          var closeAction = context.closeAction;
          closeAction.unsubscribe();
          this.remove(closeAction);
          if (!this.closed && this.timespanOnly) {
              context = this.openContext();
              var bufferTimeSpan = this.bufferTimeSpan;
              var timeSpanOnlyState = { subscriber: this, context: context, bufferTimeSpan: bufferTimeSpan };
              this.add(context.closeAction = this.scheduler.schedule(dispatchBufferTimeSpanOnly, bufferTimeSpan, timeSpanOnlyState));
          }
      };
      BufferTimeSubscriber.prototype.openContext = function () {
          var context = new Context();
          this.contexts.push(context);
          return context;
      };
      BufferTimeSubscriber.prototype.closeContext = function (context) {
          this.destination.next(context.buffer);
          var contexts = this.contexts;
          var spliceIndex = contexts ? contexts.indexOf(context) : -1;
          if (spliceIndex >= 0) {
              contexts.splice(contexts.indexOf(context), 1);
          }
      };
      return BufferTimeSubscriber;
  }(Subscriber_1.Subscriber));
  function dispatchBufferTimeSpanOnly(state) {
      var subscriber = state.subscriber;
      var prevContext = state.context;
      if (prevContext) {
          subscriber.closeContext(prevContext);
      }
      if (!subscriber.closed) {
          state.context = subscriber.openContext();
          state.context.closeAction = this.schedule(state, state.bufferTimeSpan);
      }
  }
  function dispatchBufferCreation(state) {
      var bufferCreationInterval = state.bufferCreationInterval, bufferTimeSpan = state.bufferTimeSpan, subscriber = state.subscriber, scheduler = state.scheduler;
      var context = subscriber.openContext();
      var action = this;
      if (!subscriber.closed) {
          subscriber.add(context.closeAction = scheduler.schedule(dispatchBufferClose, bufferTimeSpan, { subscriber: subscriber, context: context }));
          action.schedule(state, bufferCreationInterval);
      }
  }
  function dispatchBufferClose(arg) {
      var subscriber = arg.subscriber, context = arg.context;
      subscriber.closeContext(context);
  }
  //# sourceMappingURL=bufferTime.js.map

/***/ },
/* 283 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscription_1 = __webpack_require__(6);
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /**
   * Buffers the source Observable values starting from an emission from
   * `openings` and ending when the output of `closingSelector` emits.
   *
   * <span class="informal">Collects values from the past as an array. Starts
   * collecting only when `opening` emits, and calls the `closingSelector`
   * function to get an Observable that tells when to close the buffer.</span>
   *
   * <img src="./img/bufferToggle.png" width="100%">
   *
   * Buffers values from the source by opening the buffer via signals from an
   * Observable provided to `openings`, and closing and sending the buffers when
   * a Subscribable or Promise returned by the `closingSelector` function emits.
   *
   * @example <caption>Every other second, emit the click events from the next 500ms</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var openings = Rx.Observable.interval(1000);
   * var buffered = clicks.bufferToggle(openings, i =>
   *   i % 2 ? Rx.Observable.interval(500) : Rx.Observable.empty()
   * );
   * buffered.subscribe(x => console.log(x));
   *
   * @see {@link buffer}
   * @see {@link bufferCount}
   * @see {@link bufferTime}
   * @see {@link bufferWhen}
   * @see {@link windowToggle}
   *
   * @param {SubscribableOrPromise<O>} openings A Subscribable or Promise of notifications to start new
   * buffers.
   * @param {function(value: O): SubscribableOrPromise} closingSelector A function that takes
   * the value emitted by the `openings` observable and returns a Subscribable or Promise,
   * which, when it emits, signals that the associated buffer should be emitted
   * and cleared.
   * @return {Observable<T[]>} An observable of arrays of buffered values.
   * @method bufferToggle
   * @owner Observable
   */
  function bufferToggle(openings, closingSelector) {
      return this.lift(new BufferToggleOperator(openings, closingSelector));
  }
  exports.bufferToggle = bufferToggle;
  var BufferToggleOperator = (function () {
      function BufferToggleOperator(openings, closingSelector) {
          this.openings = openings;
          this.closingSelector = closingSelector;
      }
      BufferToggleOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new BufferToggleSubscriber(subscriber, this.openings, this.closingSelector));
      };
      return BufferToggleOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var BufferToggleSubscriber = (function (_super) {
      __extends(BufferToggleSubscriber, _super);
      function BufferToggleSubscriber(destination, openings, closingSelector) {
          _super.call(this, destination);
          this.openings = openings;
          this.closingSelector = closingSelector;
          this.contexts = [];
          this.add(subscribeToResult_1.subscribeToResult(this, openings));
      }
      BufferToggleSubscriber.prototype._next = function (value) {
          var contexts = this.contexts;
          var len = contexts.length;
          for (var i = 0; i < len; i++) {
              contexts[i].buffer.push(value);
          }
      };
      BufferToggleSubscriber.prototype._error = function (err) {
          var contexts = this.contexts;
          while (contexts.length > 0) {
              var context = contexts.shift();
              context.subscription.unsubscribe();
              context.buffer = null;
              context.subscription = null;
          }
          this.contexts = null;
          _super.prototype._error.call(this, err);
      };
      BufferToggleSubscriber.prototype._complete = function () {
          var contexts = this.contexts;
          while (contexts.length > 0) {
              var context = contexts.shift();
              this.destination.next(context.buffer);
              context.subscription.unsubscribe();
              context.buffer = null;
              context.subscription = null;
          }
          this.contexts = null;
          _super.prototype._complete.call(this);
      };
      BufferToggleSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          outerValue ? this.closeBuffer(outerValue) : this.openBuffer(innerValue);
      };
      BufferToggleSubscriber.prototype.notifyComplete = function (innerSub) {
          this.closeBuffer(innerSub.context);
      };
      BufferToggleSubscriber.prototype.openBuffer = function (value) {
          try {
              var closingSelector = this.closingSelector;
              var closingNotifier = closingSelector.call(this, value);
              if (closingNotifier) {
                  this.trySubscribe(closingNotifier);
              }
          }
          catch (err) {
              this._error(err);
          }
      };
      BufferToggleSubscriber.prototype.closeBuffer = function (context) {
          var contexts = this.contexts;
          if (contexts && context) {
              var buffer = context.buffer, subscription = context.subscription;
              this.destination.next(buffer);
              contexts.splice(contexts.indexOf(context), 1);
              this.remove(subscription);
              subscription.unsubscribe();
          }
      };
      BufferToggleSubscriber.prototype.trySubscribe = function (closingNotifier) {
          var contexts = this.contexts;
          var buffer = [];
          var subscription = new Subscription_1.Subscription();
          var context = { buffer: buffer, subscription: subscription };
          contexts.push(context);
          var innerSubscription = subscribeToResult_1.subscribeToResult(this, closingNotifier, context);
          if (!innerSubscription || innerSubscription.closed) {
              this.closeBuffer(context);
          }
          else {
              innerSubscription.context = context;
              this.add(innerSubscription);
              subscription.add(innerSubscription);
          }
      };
      return BufferToggleSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=bufferToggle.js.map

/***/ },
/* 284 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscription_1 = __webpack_require__(6);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Buffers the source Observable values, using a factory function of closing
   * Observables to determine when to close, emit, and reset the buffer.
   *
   * <span class="informal">Collects values from the past as an array. When it
   * starts collecting values, it calls a function that returns an Observable that
   * tells when to close the buffer and restart collecting.</span>
   *
   * <img src="./img/bufferWhen.png" width="100%">
   *
   * Opens a buffer immediately, then closes the buffer when the observable
   * returned by calling `closingSelector` function emits a value. When it closes
   * the buffer, it immediately opens a new buffer and repeats the process.
   *
   * @example <caption>Emit an array of the last clicks every [1-5] random seconds</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var buffered = clicks.bufferWhen(() =>
   *   Rx.Observable.interval(1000 + Math.random() * 4000)
   * );
   * buffered.subscribe(x => console.log(x));
   *
   * @see {@link buffer}
   * @see {@link bufferCount}
   * @see {@link bufferTime}
   * @see {@link bufferToggle}
   * @see {@link windowWhen}
   *
   * @param {function(): Observable} closingSelector A function that takes no
   * arguments and returns an Observable that signals buffer closure.
   * @return {Observable<T[]>} An observable of arrays of buffered values.
   * @method bufferWhen
   * @owner Observable
   */
  function bufferWhen(closingSelector) {
      return this.lift(new BufferWhenOperator(closingSelector));
  }
  exports.bufferWhen = bufferWhen;
  var BufferWhenOperator = (function () {
      function BufferWhenOperator(closingSelector) {
          this.closingSelector = closingSelector;
      }
      BufferWhenOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new BufferWhenSubscriber(subscriber, this.closingSelector));
      };
      return BufferWhenOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var BufferWhenSubscriber = (function (_super) {
      __extends(BufferWhenSubscriber, _super);
      function BufferWhenSubscriber(destination, closingSelector) {
          _super.call(this, destination);
          this.closingSelector = closingSelector;
          this.subscribing = false;
          this.openBuffer();
      }
      BufferWhenSubscriber.prototype._next = function (value) {
          this.buffer.push(value);
      };
      BufferWhenSubscriber.prototype._complete = function () {
          var buffer = this.buffer;
          if (buffer) {
              this.destination.next(buffer);
          }
          _super.prototype._complete.call(this);
      };
      BufferWhenSubscriber.prototype._unsubscribe = function () {
          this.buffer = null;
          this.subscribing = false;
      };
      BufferWhenSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.openBuffer();
      };
      BufferWhenSubscriber.prototype.notifyComplete = function () {
          if (this.subscribing) {
              this.complete();
          }
          else {
              this.openBuffer();
          }
      };
      BufferWhenSubscriber.prototype.openBuffer = function () {
          var closingSubscription = this.closingSubscription;
          if (closingSubscription) {
              this.remove(closingSubscription);
              closingSubscription.unsubscribe();
          }
          var buffer = this.buffer;
          if (this.buffer) {
              this.destination.next(buffer);
          }
          this.buffer = [];
          var closingNotifier = tryCatch_1.tryCatch(this.closingSelector)();
          if (closingNotifier === errorObject_1.errorObject) {
              this.error(errorObject_1.errorObject.e);
          }
          else {
              closingSubscription = new Subscription_1.Subscription();
              this.closingSubscription = closingSubscription;
              this.add(closingSubscription);
              this.subscribing = true;
              closingSubscription.add(subscribeToResult_1.subscribeToResult(this, closingNotifier));
              this.subscribing = false;
          }
      };
      return BufferWhenSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=bufferWhen.js.map

/***/ },
/* 285 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Catches errors on the observable to be handled by returning a new observable or throwing an error.
   * @param {function} selector a function that takes as arguments `err`, which is the error, and `caught`, which
   *  is the source observable, in case you'd like to "retry" that observable by returning it again. Whatever observable
   *  is returned by the `selector` will be used to continue the observable chain.
   * @return {Observable} an observable that originates from either the source or the observable returned by the
   *  catch `selector` function.
   * @method catch
   * @owner Observable
   */
  function _catch(selector) {
      var operator = new CatchOperator(selector);
      var caught = this.lift(operator);
      return (operator.caught = caught);
  }
  exports._catch = _catch;
  var CatchOperator = (function () {
      function CatchOperator(selector) {
          this.selector = selector;
      }
      CatchOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new CatchSubscriber(subscriber, this.selector, this.caught));
      };
      return CatchOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var CatchSubscriber = (function (_super) {
      __extends(CatchSubscriber, _super);
      function CatchSubscriber(destination, selector, caught) {
          _super.call(this, destination);
          this.selector = selector;
          this.caught = caught;
      }
      // NOTE: overriding `error` instead of `_error` because we don't want
      // to have this flag this subscriber as `isStopped`.
      CatchSubscriber.prototype.error = function (err) {
          if (!this.isStopped) {
              var result = void 0;
              try {
                  result = this.selector(err, this.caught);
              }
              catch (err) {
                  this.destination.error(err);
                  return;
              }
              this.unsubscribe();
              this.destination.remove(this);
              subscribeToResult_1.subscribeToResult(this, result);
          }
      };
      return CatchSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=catch.js.map

/***/ },
/* 286 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var combineLatest_1 = __webpack_require__(37);
  /**
   * Converts a higher-order Observable into a first-order Observable by waiting
   * for the outer Observable to complete, then applying {@link combineLatest}.
   *
   * <span class="informal">Flattens an Observable-of-Observables by applying
   * {@link combineLatest} when the Observable-of-Observables completes.</span>
   *
   * <img src="./img/combineAll.png" width="100%">
   *
   * Takes an Observable of Observables, and collects all Observables from it.
   * Once the outer Observable completes, it subscribes to all collected
   * Observables and combines their values using the {@link combineLatest}
   * strategy, such that:
   * - Every time an inner Observable emits, the output Observable emits.
   * - When the returned observable emits, it emits all of the latest values by:
   *   - If a `project` function is provided, it is called with each recent value
   *     from each inner Observable in whatever order they arrived, and the result
   *     of the `project` function is what is emitted by the output Observable.
   *   - If there is no `project` function, an array of all of the most recent
   *     values is emitted by the output Observable.
   *
   * @example <caption>Map two click events to a finite interval Observable, then apply combineAll</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var higherOrder = clicks.map(ev =>
   *   Rx.Observable.interval(Math.random()*2000).take(3)
   * ).take(2);
   * var result = higherOrder.combineAll();
   * result.subscribe(x => console.log(x));
   *
   * @see {@link combineLatest}
   * @see {@link mergeAll}
   *
   * @param {function} [project] An optional function to map the most recent
   * values from each inner Observable into a new result. Takes each of the most
   * recent values from each collected inner Observable as arguments, in order.
   * @return {Observable} An Observable of projected results or arrays of recent
   * values.
   * @method combineAll
   * @owner Observable
   */
  function combineAll(project) {
      return this.lift(new combineLatest_1.CombineLatestOperator(project));
  }
  exports.combineAll = combineAll;
  //# sourceMappingURL=combineAll.js.map

/***/ },
/* 287 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var mergeAll_1 = __webpack_require__(26);
  /* tslint:disable:max-line-length */
  function concatAll() {
      return this.lift(new mergeAll_1.MergeAllOperator(1));
  }
  exports.concatAll = concatAll;
  //# sourceMappingURL=concatAll.js.map

/***/ },
/* 288 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var mergeMap_1 = __webpack_require__(63);
  /* tslint:disable:max-line-length */
  function concatMap(project, resultSelector) {
      return this.lift(new mergeMap_1.MergeMapOperator(project, resultSelector, 1));
  }
  exports.concatMap = concatMap;
  //# sourceMappingURL=concatMap.js.map

/***/ },
/* 289 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var mergeMapTo_1 = __webpack_require__(64);
  /* tslint:disable:max-line-length */
  function concatMapTo(innerObservable, resultSelector) {
      return this.lift(new mergeMapTo_1.MergeMapToOperator(innerObservable, resultSelector, 1));
  }
  exports.concatMapTo = concatMapTo;
  //# sourceMappingURL=concatMapTo.js.map

/***/ },
/* 290 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Counts the number of emissions on the source and emits that number when the
   * source completes.
   *
   * <span class="informal">Tells how many values were emitted, when the source
   * completes.</span>
   *
   * <img src="./img/count.png" width="100%">
   *
   * `count` transforms an Observable that emits values into an Observable that
   * emits a single value that represents the number of values emitted by the
   * source Observable. If the source Observable terminates with an error, `count`
   * will pass this error notification along without emitting an value first. If
   * the source Observable does not terminate at all, `count` will neither emit
   * a value nor terminate. This operator takes an optional `predicate` function
   * as argument, in which case the output emission will represent the number of
   * source values that matched `true` with the `predicate`.
   *
   * @example <caption>Counts how many seconds have passed before the first click happened</caption>
   * var seconds = Rx.Observable.interval(1000);
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var secondsBeforeClick = seconds.takeUntil(clicks);
   * var result = secondsBeforeClick.count();
   * result.subscribe(x => console.log(x));
   *
   * @example <caption>Counts how many odd numbers are there between 1 and 7</caption>
   * var numbers = Rx.Observable.range(1, 7);
   * var result = numbers.count(i => i % 2 === 1);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link max}
   * @see {@link min}
   * @see {@link reduce}
   *
   * @param {function(value: T, i: number, source: Observable<T>): boolean} [predicate] A
   * boolean function to select what values are to be counted. It is provided with
   * arguments of:
   * - `value`: the value from the source Observable.
   * - `index`: the (zero-based) "index" of the value from the source Observable.
   * - `source`: the source Observable instance itself.
   * @return {Observable} An Observable of one number that represents the count as
   * described above.
   * @method count
   * @owner Observable
   */
  function count(predicate) {
      return this.lift(new CountOperator(predicate, this));
  }
  exports.count = count;
  var CountOperator = (function () {
      function CountOperator(predicate, source) {
          this.predicate = predicate;
          this.source = source;
      }
      CountOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new CountSubscriber(subscriber, this.predicate, this.source));
      };
      return CountOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var CountSubscriber = (function (_super) {
      __extends(CountSubscriber, _super);
      function CountSubscriber(destination, predicate, source) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.source = source;
          this.count = 0;
          this.index = 0;
      }
      CountSubscriber.prototype._next = function (value) {
          if (this.predicate) {
              this._tryPredicate(value);
          }
          else {
              this.count++;
          }
      };
      CountSubscriber.prototype._tryPredicate = function (value) {
          var result;
          try {
              result = this.predicate(value, this.index++, this.source);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          if (result) {
              this.count++;
          }
      };
      CountSubscriber.prototype._complete = function () {
          this.destination.next(this.count);
          this.destination.complete();
      };
      return CountSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=count.js.map

/***/ },
/* 291 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Emits a value from the source Observable only after a particular time span
   * determined by another Observable has passed without another source emission.
   *
   * <span class="informal">It's like {@link debounceTime}, but the time span of
   * emission silence is determined by a second Observable.</span>
   *
   * <img src="./img/debounce.png" width="100%">
   *
   * `debounce` delays values emitted by the source Observable, but drops previous
   * pending delayed emissions if a new value arrives on the source Observable.
   * This operator keeps track of the most recent value from the source
   * Observable, and spawns a duration Observable by calling the
   * `durationSelector` function. The value is emitted only when the duration
   * Observable emits a value or completes, and if no other value was emitted on
   * the source Observable since the duration Observable was spawned. If a new
   * value appears before the duration Observable emits, the previous value will
   * be dropped and will not be emitted on the output Observable.
   *
   * Like {@link debounceTime}, this is a rate-limiting operator, and also a
   * delay-like operator since output emissions do not necessarily occur at the
   * same time as they did on the source Observable.
   *
   * @example <caption>Emit the most recent click after a burst of clicks</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.debounce(() => Rx.Observable.interval(1000));
   * result.subscribe(x => console.log(x));
   *
   * @see {@link audit}
   * @see {@link debounceTime}
   * @see {@link delayWhen}
   * @see {@link throttle}
   *
   * @param {function(value: T): Observable|Promise} durationSelector A function
   * that receives a value from the source Observable, for computing the timeout
   * duration for each source value, returned as an Observable or a Promise.
   * @return {Observable} An Observable that delays the emissions of the source
   * Observable by the specified duration Observable returned by
   * `durationSelector`, and may drop some values if they occur too frequently.
   * @method debounce
   * @owner Observable
   */
  function debounce(durationSelector) {
      return this.lift(new DebounceOperator(durationSelector));
  }
  exports.debounce = debounce;
  var DebounceOperator = (function () {
      function DebounceOperator(durationSelector) {
          this.durationSelector = durationSelector;
      }
      DebounceOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DebounceSubscriber(subscriber, this.durationSelector));
      };
      return DebounceOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DebounceSubscriber = (function (_super) {
      __extends(DebounceSubscriber, _super);
      function DebounceSubscriber(destination, durationSelector) {
          _super.call(this, destination);
          this.durationSelector = durationSelector;
          this.hasValue = false;
          this.durationSubscription = null;
      }
      DebounceSubscriber.prototype._next = function (value) {
          try {
              var result = this.durationSelector.call(this, value);
              if (result) {
                  this._tryNext(value, result);
              }
          }
          catch (err) {
              this.destination.error(err);
          }
      };
      DebounceSubscriber.prototype._complete = function () {
          this.emitValue();
          this.destination.complete();
      };
      DebounceSubscriber.prototype._tryNext = function (value, duration) {
          var subscription = this.durationSubscription;
          this.value = value;
          this.hasValue = true;
          if (subscription) {
              subscription.unsubscribe();
              this.remove(subscription);
          }
          subscription = subscribeToResult_1.subscribeToResult(this, duration);
          if (!subscription.closed) {
              this.add(this.durationSubscription = subscription);
          }
      };
      DebounceSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.emitValue();
      };
      DebounceSubscriber.prototype.notifyComplete = function () {
          this.emitValue();
      };
      DebounceSubscriber.prototype.emitValue = function () {
          if (this.hasValue) {
              var value = this.value;
              var subscription = this.durationSubscription;
              if (subscription) {
                  this.durationSubscription = null;
                  subscription.unsubscribe();
                  this.remove(subscription);
              }
              this.value = null;
              this.hasValue = false;
              _super.prototype._next.call(this, value);
          }
      };
      return DebounceSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=debounce.js.map

/***/ },
/* 292 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var async_1 = __webpack_require__(10);
  /**
   * Emits a value from the source Observable only after a particular time span
   * has passed without another source emission.
   *
   * <span class="informal">It's like {@link delay}, but passes only the most
   * recent value from each burst of emissions.</span>
   *
   * <img src="./img/debounceTime.png" width="100%">
   *
   * `debounceTime` delays values emitted by the source Observable, but drops
   * previous pending delayed emissions if a new value arrives on the source
   * Observable. This operator keeps track of the most recent value from the
   * source Observable, and emits that only when `dueTime` enough time has passed
   * without any other value appearing on the source Observable. If a new value
   * appears before `dueTime` silence occurs, the previous value will be dropped
   * and will not be emitted on the output Observable.
   *
   * This is a rate-limiting operator, because it is impossible for more than one
   * value to be emitted in any time window of duration `dueTime`, but it is also
   * a delay-like operator since output emissions do not occur at the same time as
   * they did on the source Observable. Optionally takes a {@link Scheduler} for
   * managing timers.
   *
   * @example <caption>Emit the most recent click after a burst of clicks</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.debounceTime(1000);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link auditTime}
   * @see {@link debounce}
   * @see {@link delay}
   * @see {@link sampleTime}
   * @see {@link throttleTime}
   *
   * @param {number} dueTime The timeout duration in milliseconds (or the time
   * unit determined internally by the optional `scheduler`) for the window of
   * time required to wait for emission silence before emitting the most recent
   * source value.
   * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
   * managing the timers that handle the timeout for each value.
   * @return {Observable} An Observable that delays the emissions of the source
   * Observable by the specified `dueTime`, and may drop some values if they occur
   * too frequently.
   * @method debounceTime
   * @owner Observable
   */
  function debounceTime(dueTime, scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new DebounceTimeOperator(dueTime, scheduler));
  }
  exports.debounceTime = debounceTime;
  var DebounceTimeOperator = (function () {
      function DebounceTimeOperator(dueTime, scheduler) {
          this.dueTime = dueTime;
          this.scheduler = scheduler;
      }
      DebounceTimeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DebounceTimeSubscriber(subscriber, this.dueTime, this.scheduler));
      };
      return DebounceTimeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DebounceTimeSubscriber = (function (_super) {
      __extends(DebounceTimeSubscriber, _super);
      function DebounceTimeSubscriber(destination, dueTime, scheduler) {
          _super.call(this, destination);
          this.dueTime = dueTime;
          this.scheduler = scheduler;
          this.debouncedSubscription = null;
          this.lastValue = null;
          this.hasValue = false;
      }
      DebounceTimeSubscriber.prototype._next = function (value) {
          this.clearDebounce();
          this.lastValue = value;
          this.hasValue = true;
          this.add(this.debouncedSubscription = this.scheduler.schedule(dispatchNext, this.dueTime, this));
      };
      DebounceTimeSubscriber.prototype._complete = function () {
          this.debouncedNext();
          this.destination.complete();
      };
      DebounceTimeSubscriber.prototype.debouncedNext = function () {
          this.clearDebounce();
          if (this.hasValue) {
              this.destination.next(this.lastValue);
              this.lastValue = null;
              this.hasValue = false;
          }
      };
      DebounceTimeSubscriber.prototype.clearDebounce = function () {
          var debouncedSubscription = this.debouncedSubscription;
          if (debouncedSubscription !== null) {
              this.remove(debouncedSubscription);
              debouncedSubscription.unsubscribe();
              this.debouncedSubscription = null;
          }
      };
      return DebounceTimeSubscriber;
  }(Subscriber_1.Subscriber));
  function dispatchNext(subscriber) {
      subscriber.debouncedNext();
  }
  //# sourceMappingURL=debounceTime.js.map

/***/ },
/* 293 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /* tslint:disable:max-line-length */
  function defaultIfEmpty(defaultValue) {
      if (defaultValue === void 0) { defaultValue = null; }
      return this.lift(new DefaultIfEmptyOperator(defaultValue));
  }
  exports.defaultIfEmpty = defaultIfEmpty;
  var DefaultIfEmptyOperator = (function () {
      function DefaultIfEmptyOperator(defaultValue) {
          this.defaultValue = defaultValue;
      }
      DefaultIfEmptyOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DefaultIfEmptySubscriber(subscriber, this.defaultValue));
      };
      return DefaultIfEmptyOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DefaultIfEmptySubscriber = (function (_super) {
      __extends(DefaultIfEmptySubscriber, _super);
      function DefaultIfEmptySubscriber(destination, defaultValue) {
          _super.call(this, destination);
          this.defaultValue = defaultValue;
          this.isEmpty = true;
      }
      DefaultIfEmptySubscriber.prototype._next = function (value) {
          this.isEmpty = false;
          this.destination.next(value);
      };
      DefaultIfEmptySubscriber.prototype._complete = function () {
          if (this.isEmpty) {
              this.destination.next(this.defaultValue);
          }
          this.destination.complete();
      };
      return DefaultIfEmptySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=defaultIfEmpty.js.map

/***/ },
/* 294 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var async_1 = __webpack_require__(10);
  var isDate_1 = __webpack_require__(31);
  var Subscriber_1 = __webpack_require__(2);
  var Notification_1 = __webpack_require__(20);
  /**
   * Delays the emission of items from the source Observable by a given timeout or
   * until a given Date.
   *
   * <span class="informal">Time shifts each item by some specified amount of
   * milliseconds.</span>
   *
   * <img src="./img/delay.png" width="100%">
   *
   * If the delay argument is a Number, this operator time shifts the source
   * Observable by that amount of time expressed in milliseconds. The relative
   * time intervals between the values are preserved.
   *
   * If the delay argument is a Date, this operator time shifts the start of the
   * Observable execution until the given date occurs.
   *
   * @example <caption>Delay each click by one second</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var delayedClicks = clicks.delay(1000); // each click emitted after 1 second
   * delayedClicks.subscribe(x => console.log(x));
   *
   * @example <caption>Delay all clicks until a future date happens</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var date = new Date('March 15, 2050 12:00:00'); // in the future
   * var delayedClicks = clicks.delay(date); // click emitted only after that date
   * delayedClicks.subscribe(x => console.log(x));
   *
   * @see {@link debounceTime}
   * @see {@link delayWhen}
   *
   * @param {number|Date} delay The delay duration in milliseconds (a `number`) or
   * a `Date` until which the emission of the source items is delayed.
   * @param {Scheduler} [scheduler=async] The Scheduler to use for
   * managing the timers that handle the time-shift for each item.
   * @return {Observable} An Observable that delays the emissions of the source
   * Observable by the specified timeout or Date.
   * @method delay
   * @owner Observable
   */
  function delay(delay, scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      var absoluteDelay = isDate_1.isDate(delay);
      var delayFor = absoluteDelay ? (+delay - scheduler.now()) : Math.abs(delay);
      return this.lift(new DelayOperator(delayFor, scheduler));
  }
  exports.delay = delay;
  var DelayOperator = (function () {
      function DelayOperator(delay, scheduler) {
          this.delay = delay;
          this.scheduler = scheduler;
      }
      DelayOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DelaySubscriber(subscriber, this.delay, this.scheduler));
      };
      return DelayOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DelaySubscriber = (function (_super) {
      __extends(DelaySubscriber, _super);
      function DelaySubscriber(destination, delay, scheduler) {
          _super.call(this, destination);
          this.delay = delay;
          this.scheduler = scheduler;
          this.queue = [];
          this.active = false;
          this.errored = false;
      }
      DelaySubscriber.dispatch = function (state) {
          var source = state.source;
          var queue = source.queue;
          var scheduler = state.scheduler;
          var destination = state.destination;
          while (queue.length > 0 && (queue[0].time - scheduler.now()) <= 0) {
              queue.shift().notification.observe(destination);
          }
          if (queue.length > 0) {
              var delay_1 = Math.max(0, queue[0].time - scheduler.now());
              this.schedule(state, delay_1);
          }
          else {
              source.active = false;
          }
      };
      DelaySubscriber.prototype._schedule = function (scheduler) {
          this.active = true;
          this.add(scheduler.schedule(DelaySubscriber.dispatch, this.delay, {
              source: this, destination: this.destination, scheduler: scheduler
          }));
      };
      DelaySubscriber.prototype.scheduleNotification = function (notification) {
          if (this.errored === true) {
              return;
          }
          var scheduler = this.scheduler;
          var message = new DelayMessage(scheduler.now() + this.delay, notification);
          this.queue.push(message);
          if (this.active === false) {
              this._schedule(scheduler);
          }
      };
      DelaySubscriber.prototype._next = function (value) {
          this.scheduleNotification(Notification_1.Notification.createNext(value));
      };
      DelaySubscriber.prototype._error = function (err) {
          this.errored = true;
          this.queue = [];
          this.destination.error(err);
      };
      DelaySubscriber.prototype._complete = function () {
          this.scheduleNotification(Notification_1.Notification.createComplete());
      };
      return DelaySubscriber;
  }(Subscriber_1.Subscriber));
  var DelayMessage = (function () {
      function DelayMessage(time, notification) {
          this.time = time;
          this.notification = notification;
      }
      return DelayMessage;
  }());
  //# sourceMappingURL=delay.js.map

/***/ },
/* 295 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var Observable_1 = __webpack_require__(1);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Delays the emission of items from the source Observable by a given time span
   * determined by the emissions of another Observable.
   *
   * <span class="informal">It's like {@link delay}, but the time span of the
   * delay duration is determined by a second Observable.</span>
   *
   * <img src="./img/delayWhen.png" width="100%">
   *
   * `delayWhen` time shifts each emitted value from the source Observable by a
   * time span determined by another Observable. When the source emits a value,
   * the `delayDurationSelector` function is called with the source value as
   * argument, and should return an Observable, called the "duration" Observable.
   * The source value is emitted on the output Observable only when the duration
   * Observable emits a value or completes.
   *
   * Optionally, `delayWhen` takes a second argument, `subscriptionDelay`, which
   * is an Observable. When `subscriptionDelay` emits its first value or
   * completes, the source Observable is subscribed to and starts behaving like
   * described in the previous paragraph. If `subscriptionDelay` is not provided,
   * `delayWhen` will subscribe to the source Observable as soon as the output
   * Observable is subscribed.
   *
   * @example <caption>Delay each click by a random amount of time, between 0 and 5 seconds</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var delayedClicks = clicks.delayWhen(event =>
   *   Rx.Observable.interval(Math.random() * 5000)
   * );
   * delayedClicks.subscribe(x => console.log(x));
   *
   * @see {@link debounce}
   * @see {@link delay}
   *
   * @param {function(value: T): Observable} delayDurationSelector A function that
   * returns an Observable for each value emitted by the source Observable, which
   * is then used to delay the emission of that item on the output Observable
   * until the Observable returned from this function emits a value.
   * @param {Observable} subscriptionDelay An Observable that triggers the
   * subscription to the source Observable once it emits any value.
   * @return {Observable} An Observable that delays the emissions of the source
   * Observable by an amount of time specified by the Observable returned by
   * `delayDurationSelector`.
   * @method delayWhen
   * @owner Observable
   */
  function delayWhen(delayDurationSelector, subscriptionDelay) {
      if (subscriptionDelay) {
          return new SubscriptionDelayObservable(this, subscriptionDelay)
              .lift(new DelayWhenOperator(delayDurationSelector));
      }
      return this.lift(new DelayWhenOperator(delayDurationSelector));
  }
  exports.delayWhen = delayWhen;
  var DelayWhenOperator = (function () {
      function DelayWhenOperator(delayDurationSelector) {
          this.delayDurationSelector = delayDurationSelector;
      }
      DelayWhenOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DelayWhenSubscriber(subscriber, this.delayDurationSelector));
      };
      return DelayWhenOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DelayWhenSubscriber = (function (_super) {
      __extends(DelayWhenSubscriber, _super);
      function DelayWhenSubscriber(destination, delayDurationSelector) {
          _super.call(this, destination);
          this.delayDurationSelector = delayDurationSelector;
          this.completed = false;
          this.delayNotifierSubscriptions = [];
          this.values = [];
      }
      DelayWhenSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.destination.next(outerValue);
          this.removeSubscription(innerSub);
          this.tryComplete();
      };
      DelayWhenSubscriber.prototype.notifyError = function (error, innerSub) {
          this._error(error);
      };
      DelayWhenSubscriber.prototype.notifyComplete = function (innerSub) {
          var value = this.removeSubscription(innerSub);
          if (value) {
              this.destination.next(value);
          }
          this.tryComplete();
      };
      DelayWhenSubscriber.prototype._next = function (value) {
          try {
              var delayNotifier = this.delayDurationSelector(value);
              if (delayNotifier) {
                  this.tryDelay(delayNotifier, value);
              }
          }
          catch (err) {
              this.destination.error(err);
          }
      };
      DelayWhenSubscriber.prototype._complete = function () {
          this.completed = true;
          this.tryComplete();
      };
      DelayWhenSubscriber.prototype.removeSubscription = function (subscription) {
          subscription.unsubscribe();
          var subscriptionIdx = this.delayNotifierSubscriptions.indexOf(subscription);
          var value = null;
          if (subscriptionIdx !== -1) {
              value = this.values[subscriptionIdx];
              this.delayNotifierSubscriptions.splice(subscriptionIdx, 1);
              this.values.splice(subscriptionIdx, 1);
          }
          return value;
      };
      DelayWhenSubscriber.prototype.tryDelay = function (delayNotifier, value) {
          var notifierSubscription = subscribeToResult_1.subscribeToResult(this, delayNotifier, value);
          this.add(notifierSubscription);
          this.delayNotifierSubscriptions.push(notifierSubscription);
          this.values.push(value);
      };
      DelayWhenSubscriber.prototype.tryComplete = function () {
          if (this.completed && this.delayNotifierSubscriptions.length === 0) {
              this.destination.complete();
          }
      };
      return DelayWhenSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SubscriptionDelayObservable = (function (_super) {
      __extends(SubscriptionDelayObservable, _super);
      function SubscriptionDelayObservable(source, subscriptionDelay) {
          _super.call(this);
          this.source = source;
          this.subscriptionDelay = subscriptionDelay;
      }
      SubscriptionDelayObservable.prototype._subscribe = function (subscriber) {
          this.subscriptionDelay.subscribe(new SubscriptionDelaySubscriber(subscriber, this.source));
      };
      return SubscriptionDelayObservable;
  }(Observable_1.Observable));
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SubscriptionDelaySubscriber = (function (_super) {
      __extends(SubscriptionDelaySubscriber, _super);
      function SubscriptionDelaySubscriber(parent, source) {
          _super.call(this);
          this.parent = parent;
          this.source = source;
          this.sourceSubscribed = false;
      }
      SubscriptionDelaySubscriber.prototype._next = function (unused) {
          this.subscribeToSource();
      };
      SubscriptionDelaySubscriber.prototype._error = function (err) {
          this.unsubscribe();
          this.parent.error(err);
      };
      SubscriptionDelaySubscriber.prototype._complete = function () {
          this.subscribeToSource();
      };
      SubscriptionDelaySubscriber.prototype.subscribeToSource = function () {
          if (!this.sourceSubscribed) {
              this.sourceSubscribed = true;
              this.unsubscribe();
              this.source.subscribe(this.parent);
          }
      };
      return SubscriptionDelaySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=delayWhen.js.map

/***/ },
/* 296 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Converts an Observable of {@link Notification} objects into the emissions
   * that they represent.
   *
   * <span class="informal">Unwraps {@link Notification} objects as actual `next`,
   * `error` and `complete` emissions. The opposite of {@link materialize}.</span>
   *
   * <img src="./img/dematerialize.png" width="100%">
   *
   * `dematerialize` is assumed to operate an Observable that only emits
   * {@link Notification} objects as `next` emissions, and does not emit any
   * `error`. Such Observable is the output of a `materialize` operation. Those
   * notifications are then unwrapped using the metadata they contain, and emitted
   * as `next`, `error`, and `complete` on the output Observable.
   *
   * Use this operator in conjunction with {@link materialize}.
   *
   * @example <caption>Convert an Observable of Notifications to an actual Observable</caption>
   * var notifA = new Rx.Notification('N', 'A');
   * var notifB = new Rx.Notification('N', 'B');
   * var notifE = new Rx.Notification('E', void 0,
   *   new TypeError('x.toUpperCase is not a function')
   * );
   * var materialized = Rx.Observable.of(notifA, notifB, notifE);
   * var upperCase = materialized.dematerialize();
   * upperCase.subscribe(x => console.log(x), e => console.error(e));
   *
   * @see {@link Notification}
   * @see {@link materialize}
   *
   * @return {Observable} An Observable that emits items and notifications
   * embedded in Notification objects emitted by the source Observable.
   * @method dematerialize
   * @owner Observable
   */
  function dematerialize() {
      return this.lift(new DeMaterializeOperator());
  }
  exports.dematerialize = dematerialize;
  var DeMaterializeOperator = (function () {
      function DeMaterializeOperator() {
      }
      DeMaterializeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DeMaterializeSubscriber(subscriber));
      };
      return DeMaterializeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DeMaterializeSubscriber = (function (_super) {
      __extends(DeMaterializeSubscriber, _super);
      function DeMaterializeSubscriber(destination) {
          _super.call(this, destination);
      }
      DeMaterializeSubscriber.prototype._next = function (value) {
          value.observe(this.destination);
      };
      return DeMaterializeSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=dematerialize.js.map

/***/ },
/* 297 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var distinct_1 = __webpack_require__(58);
  /* tslint:disable:max-line-length */
  function distinctKey(key, compare, flushes) {
      return distinct_1.distinct.call(this, function (x, y) {
          if (compare) {
              return compare(x[key], y[key]);
          }
          return x[key] === y[key];
      }, flushes);
  }
  exports.distinctKey = distinctKey;
  //# sourceMappingURL=distinctKey.js.map

/***/ },
/* 298 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var distinctUntilChanged_1 = __webpack_require__(59);
  /* tslint:disable:max-line-length */
  function distinctUntilKeyChanged(key, compare) {
      return distinctUntilChanged_1.distinctUntilChanged.call(this, function (x, y) {
          if (compare) {
              return compare(x[key], y[key]);
          }
          return x[key] === y[key];
      });
  }
  exports.distinctUntilKeyChanged = distinctUntilKeyChanged;
  //# sourceMappingURL=distinctUntilKeyChanged.js.map

/***/ },
/* 299 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /* tslint:disable:max-line-length */
  function _do(nextOrObserver, error, complete) {
      return this.lift(new DoOperator(nextOrObserver, error, complete));
  }
  exports._do = _do;
  var DoOperator = (function () {
      function DoOperator(nextOrObserver, error, complete) {
          this.nextOrObserver = nextOrObserver;
          this.error = error;
          this.complete = complete;
      }
      DoOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new DoSubscriber(subscriber, this.nextOrObserver, this.error, this.complete));
      };
      return DoOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var DoSubscriber = (function (_super) {
      __extends(DoSubscriber, _super);
      function DoSubscriber(destination, nextOrObserver, error, complete) {
          _super.call(this, destination);
          var safeSubscriber = new Subscriber_1.Subscriber(nextOrObserver, error, complete);
          safeSubscriber.syncErrorThrowable = true;
          this.add(safeSubscriber);
          this.safeSubscriber = safeSubscriber;
      }
      DoSubscriber.prototype._next = function (value) {
          var safeSubscriber = this.safeSubscriber;
          safeSubscriber.next(value);
          if (safeSubscriber.syncErrorThrown) {
              this.destination.error(safeSubscriber.syncErrorValue);
          }
          else {
              this.destination.next(value);
          }
      };
      DoSubscriber.prototype._error = function (err) {
          var safeSubscriber = this.safeSubscriber;
          safeSubscriber.error(err);
          if (safeSubscriber.syncErrorThrown) {
              this.destination.error(safeSubscriber.syncErrorValue);
          }
          else {
              this.destination.error(err);
          }
      };
      DoSubscriber.prototype._complete = function () {
          var safeSubscriber = this.safeSubscriber;
          safeSubscriber.complete();
          if (safeSubscriber.syncErrorThrown) {
              this.destination.error(safeSubscriber.syncErrorValue);
          }
          else {
              this.destination.complete();
          }
      };
      return DoSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=do.js.map

/***/ },
/* 300 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var ArgumentOutOfRangeError_1 = __webpack_require__(29);
  /**
   * Emits the single value at the specified `index` in a sequence of emissions
   * from the source Observable.
   *
   * <span class="informal">Emits only the i-th value, then completes.</span>
   *
   * <img src="./img/elementAt.png" width="100%">
   *
   * `elementAt` returns an Observable that emits the item at the specified
   * `index` in the source Observable, or a default value if that `index` is out
   * of range and the `default` argument is provided. If the `default` argument is
   * not given and the `index` is out of range, the output Observable will emit an
   * `ArgumentOutOfRangeError` error.
   *
   * @example <caption>Emit only the third click event</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.elementAt(2);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link first}
   * @see {@link last}
   * @see {@link skip}
   * @see {@link single}
   * @see {@link take}
   *
   * @throws {ArgumentOutOfRangeError} When using `elementAt(i)`, it delivers an
   * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0` or the
   * Observable has completed before emitting the i-th `next` notification.
   *
   * @param {number} index Is the number `i` for the i-th source emission that has
   * happened since the subscription, starting from the number `0`.
   * @param {T} [defaultValue] The default value returned for missing indices.
   * @return {Observable} An Observable that emits a single item, if it is found.
   * Otherwise, will emit the default value if given. If not, then emits an error.
   * @method elementAt
   * @owner Observable
   */
  function elementAt(index, defaultValue) {
      return this.lift(new ElementAtOperator(index, defaultValue));
  }
  exports.elementAt = elementAt;
  var ElementAtOperator = (function () {
      function ElementAtOperator(index, defaultValue) {
          this.index = index;
          this.defaultValue = defaultValue;
          if (index < 0) {
              throw new ArgumentOutOfRangeError_1.ArgumentOutOfRangeError;
          }
      }
      ElementAtOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ElementAtSubscriber(subscriber, this.index, this.defaultValue));
      };
      return ElementAtOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ElementAtSubscriber = (function (_super) {
      __extends(ElementAtSubscriber, _super);
      function ElementAtSubscriber(destination, index, defaultValue) {
          _super.call(this, destination);
          this.index = index;
          this.defaultValue = defaultValue;
      }
      ElementAtSubscriber.prototype._next = function (x) {
          if (this.index-- === 0) {
              this.destination.next(x);
              this.destination.complete();
          }
      };
      ElementAtSubscriber.prototype._complete = function () {
          var destination = this.destination;
          if (this.index >= 0) {
              if (typeof this.defaultValue !== 'undefined') {
                  destination.next(this.defaultValue);
              }
              else {
                  destination.error(new ArgumentOutOfRangeError_1.ArgumentOutOfRangeError);
              }
          }
          destination.complete();
      };
      return ElementAtSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=elementAt.js.map

/***/ },
/* 301 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Returns an Observable that emits whether or not every item of the source satisfies the condition specified.
   * @param {function} predicate a function for determining if an item meets a specified condition.
   * @param {any} [thisArg] optional object to use for `this` in the callback
   * @return {Observable} an Observable of booleans that determines if all items of the source Observable meet the condition specified.
   * @method every
   * @owner Observable
   */
  function every(predicate, thisArg) {
      return this.lift(new EveryOperator(predicate, thisArg, this));
  }
  exports.every = every;
  var EveryOperator = (function () {
      function EveryOperator(predicate, thisArg, source) {
          this.predicate = predicate;
          this.thisArg = thisArg;
          this.source = source;
      }
      EveryOperator.prototype.call = function (observer, source) {
          return source._subscribe(new EverySubscriber(observer, this.predicate, this.thisArg, this.source));
      };
      return EveryOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var EverySubscriber = (function (_super) {
      __extends(EverySubscriber, _super);
      function EverySubscriber(destination, predicate, thisArg, source) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.thisArg = thisArg;
          this.source = source;
          this.index = 0;
          this.thisArg = thisArg || this;
      }
      EverySubscriber.prototype.notifyComplete = function (everyValueMatch) {
          this.destination.next(everyValueMatch);
          this.destination.complete();
      };
      EverySubscriber.prototype._next = function (value) {
          var result = false;
          try {
              result = this.predicate.call(this.thisArg, value, this.index++, this.source);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          if (!result) {
              this.notifyComplete(false);
          }
      };
      EverySubscriber.prototype._complete = function () {
          this.notifyComplete(true);
      };
      return EverySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=every.js.map

/***/ },
/* 302 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Converts a higher-order Observable into a first-order Observable by dropping
   * inner Observables while the previous inner Observable has not yet completed.
   *
   * <span class="informal">Flattens an Observable-of-Observables by dropping the
   * next inner Observables while the current inner is still executing.</span>
   *
   * <img src="./img/exhaust.png" width="100%">
   *
   * `exhaust` subscribes to an Observable that emits Observables, also known as a
   * higher-order Observable. Each time it observes one of these emitted inner
   * Observables, the output Observable begins emitting the items emitted by that
   * inner Observable. So far, it behaves like {@link mergeAll}. However,
   * `exhaust` ignores every new inner Observable if the previous Observable has
   * not yet completed. Once that one completes, it will accept and flatten the
   * next inner Observable and repeat this process.
   *
   * @example <caption>Run a finite timer for each click, only if there is no currently active timer</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
   * var result = higherOrder.exhaust();
   * result.subscribe(x => console.log(x));
   *
   * @see {@link combineAll}
   * @see {@link concatAll}
   * @see {@link switch}
   * @see {@link mergeAll}
   * @see {@link exhaustMap}
   * @see {@link zipAll}
   *
   * @return {Observable} Returns an Observable that takes a source of Observables
   * and propagates the first observable exclusively until it completes before
   * subscribing to the next.
   * @method exhaust
   * @owner Observable
   */
  function exhaust() {
      return this.lift(new SwitchFirstOperator());
  }
  exports.exhaust = exhaust;
  var SwitchFirstOperator = (function () {
      function SwitchFirstOperator() {
      }
      SwitchFirstOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SwitchFirstSubscriber(subscriber));
      };
      return SwitchFirstOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SwitchFirstSubscriber = (function (_super) {
      __extends(SwitchFirstSubscriber, _super);
      function SwitchFirstSubscriber(destination) {
          _super.call(this, destination);
          this.hasCompleted = false;
          this.hasSubscription = false;
      }
      SwitchFirstSubscriber.prototype._next = function (value) {
          if (!this.hasSubscription) {
              this.hasSubscription = true;
              this.add(subscribeToResult_1.subscribeToResult(this, value));
          }
      };
      SwitchFirstSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (!this.hasSubscription) {
              this.destination.complete();
          }
      };
      SwitchFirstSubscriber.prototype.notifyComplete = function (innerSub) {
          this.remove(innerSub);
          this.hasSubscription = false;
          if (this.hasCompleted) {
              this.destination.complete();
          }
      };
      return SwitchFirstSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=exhaust.js.map

/***/ },
/* 303 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function exhaustMap(project, resultSelector) {
      return this.lift(new SwitchFirstMapOperator(project, resultSelector));
  }
  exports.exhaustMap = exhaustMap;
  var SwitchFirstMapOperator = (function () {
      function SwitchFirstMapOperator(project, resultSelector) {
          this.project = project;
          this.resultSelector = resultSelector;
      }
      SwitchFirstMapOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SwitchFirstMapSubscriber(subscriber, this.project, this.resultSelector));
      };
      return SwitchFirstMapOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SwitchFirstMapSubscriber = (function (_super) {
      __extends(SwitchFirstMapSubscriber, _super);
      function SwitchFirstMapSubscriber(destination, project, resultSelector) {
          _super.call(this, destination);
          this.project = project;
          this.resultSelector = resultSelector;
          this.hasSubscription = false;
          this.hasCompleted = false;
          this.index = 0;
      }
      SwitchFirstMapSubscriber.prototype._next = function (value) {
          if (!this.hasSubscription) {
              this.tryNext(value);
          }
      };
      SwitchFirstMapSubscriber.prototype.tryNext = function (value) {
          var index = this.index++;
          var destination = this.destination;
          try {
              var result = this.project(value, index);
              this.hasSubscription = true;
              this.add(subscribeToResult_1.subscribeToResult(this, result, value, index));
          }
          catch (err) {
              destination.error(err);
          }
      };
      SwitchFirstMapSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (!this.hasSubscription) {
              this.destination.complete();
          }
      };
      SwitchFirstMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var _a = this, resultSelector = _a.resultSelector, destination = _a.destination;
          if (resultSelector) {
              this.trySelectResult(outerValue, innerValue, outerIndex, innerIndex);
          }
          else {
              destination.next(innerValue);
          }
      };
      SwitchFirstMapSubscriber.prototype.trySelectResult = function (outerValue, innerValue, outerIndex, innerIndex) {
          var _a = this, resultSelector = _a.resultSelector, destination = _a.destination;
          try {
              var result = resultSelector(outerValue, innerValue, outerIndex, innerIndex);
              destination.next(result);
          }
          catch (err) {
              destination.error(err);
          }
      };
      SwitchFirstMapSubscriber.prototype.notifyError = function (err) {
          this.destination.error(err);
      };
      SwitchFirstMapSubscriber.prototype.notifyComplete = function (innerSub) {
          this.remove(innerSub);
          this.hasSubscription = false;
          if (this.hasCompleted) {
              this.destination.complete();
          }
      };
      return SwitchFirstMapSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=exhaustMap.js.map

/***/ },
/* 304 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function expand(project, concurrent, scheduler) {
      if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
      if (scheduler === void 0) { scheduler = undefined; }
      concurrent = (concurrent || 0) < 1 ? Number.POSITIVE_INFINITY : concurrent;
      return this.lift(new ExpandOperator(project, concurrent, scheduler));
  }
  exports.expand = expand;
  var ExpandOperator = (function () {
      function ExpandOperator(project, concurrent, scheduler) {
          this.project = project;
          this.concurrent = concurrent;
          this.scheduler = scheduler;
      }
      ExpandOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ExpandSubscriber(subscriber, this.project, this.concurrent, this.scheduler));
      };
      return ExpandOperator;
  }());
  exports.ExpandOperator = ExpandOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ExpandSubscriber = (function (_super) {
      __extends(ExpandSubscriber, _super);
      function ExpandSubscriber(destination, project, concurrent, scheduler) {
          _super.call(this, destination);
          this.project = project;
          this.concurrent = concurrent;
          this.scheduler = scheduler;
          this.index = 0;
          this.active = 0;
          this.hasCompleted = false;
          if (concurrent < Number.POSITIVE_INFINITY) {
              this.buffer = [];
          }
      }
      ExpandSubscriber.dispatch = function (arg) {
          var subscriber = arg.subscriber, result = arg.result, value = arg.value, index = arg.index;
          subscriber.subscribeToProjection(result, value, index);
      };
      ExpandSubscriber.prototype._next = function (value) {
          var destination = this.destination;
          if (destination.closed) {
              this._complete();
              return;
          }
          var index = this.index++;
          if (this.active < this.concurrent) {
              destination.next(value);
              var result = tryCatch_1.tryCatch(this.project)(value, index);
              if (result === errorObject_1.errorObject) {
                  destination.error(errorObject_1.errorObject.e);
              }
              else if (!this.scheduler) {
                  this.subscribeToProjection(result, value, index);
              }
              else {
                  var state = { subscriber: this, result: result, value: value, index: index };
                  this.add(this.scheduler.schedule(ExpandSubscriber.dispatch, 0, state));
              }
          }
          else {
              this.buffer.push(value);
          }
      };
      ExpandSubscriber.prototype.subscribeToProjection = function (result, value, index) {
          this.active++;
          this.add(subscribeToResult_1.subscribeToResult(this, result, value, index));
      };
      ExpandSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (this.hasCompleted && this.active === 0) {
              this.destination.complete();
          }
      };
      ExpandSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this._next(innerValue);
      };
      ExpandSubscriber.prototype.notifyComplete = function (innerSub) {
          var buffer = this.buffer;
          this.remove(innerSub);
          this.active--;
          if (buffer && buffer.length > 0) {
              this._next(buffer.shift());
          }
          if (this.hasCompleted && this.active === 0) {
              this.destination.complete();
          }
      };
      return ExpandSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.ExpandSubscriber = ExpandSubscriber;
  //# sourceMappingURL=expand.js.map

/***/ },
/* 305 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var Subscription_1 = __webpack_require__(6);
  /**
   * Returns an Observable that mirrors the source Observable, but will call a specified function when
   * the source terminates on complete or error.
   * @param {function} callback function to be called when source terminates.
   * @return {Observable} an Observable that mirrors the source, but will call the specified function on termination.
   * @method finally
   * @owner Observable
   */
  function _finally(callback) {
      return this.lift(new FinallyOperator(callback));
  }
  exports._finally = _finally;
  var FinallyOperator = (function () {
      function FinallyOperator(callback) {
          this.callback = callback;
      }
      FinallyOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new FinallySubscriber(subscriber, this.callback));
      };
      return FinallyOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var FinallySubscriber = (function (_super) {
      __extends(FinallySubscriber, _super);
      function FinallySubscriber(destination, callback) {
          _super.call(this, destination);
          this.add(new Subscription_1.Subscription(callback));
      }
      return FinallySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=finally.js.map

/***/ },
/* 306 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var find_1 = __webpack_require__(61);
  /**
   * Emits only the index of the first value emitted by the source Observable that
   * meets some condition.
   *
   * <span class="informal">It's like {@link find}, but emits the index of the
   * found value, not the value itself.</span>
   *
   * <img src="./img/findIndex.png" width="100%">
   *
   * `findIndex` searches for the first item in the source Observable that matches
   * the specified condition embodied by the `predicate`, and returns the
   * (zero-based) index of the first occurrence in the source. Unlike
   * {@link first}, the `predicate` is required in `findIndex`, and does not emit
   * an error if a valid value is not found.
   *
   * @example <caption>Emit the index of first click that happens on a DIV element</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.findIndex(ev => ev.target.tagName === 'DIV');
   * result.subscribe(x => console.log(x));
   *
   * @see {@link filter}
   * @see {@link find}
   * @see {@link first}
   * @see {@link take}
   *
   * @param {function(value: T, index: number, source: Observable<T>): boolean} predicate
   * A function called with each item to test for condition matching.
   * @param {any} [thisArg] An optional argument to determine the value of `this`
   * in the `predicate` function.
   * @return {Observable} An Observable of the index of the first item that
   * matches the condition.
   * @method find
   * @owner Observable
   */
  function findIndex(predicate, thisArg) {
      return this.lift(new find_1.FindValueOperator(predicate, this, true, thisArg));
  }
  exports.findIndex = findIndex;
  //# sourceMappingURL=findIndex.js.map

/***/ },
/* 307 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var EmptyError_1 = __webpack_require__(30);
  /* tslint:disable:max-line-length */
  function first(predicate, resultSelector, defaultValue) {
      return this.lift(new FirstOperator(predicate, resultSelector, defaultValue, this));
  }
  exports.first = first;
  var FirstOperator = (function () {
      function FirstOperator(predicate, resultSelector, defaultValue, source) {
          this.predicate = predicate;
          this.resultSelector = resultSelector;
          this.defaultValue = defaultValue;
          this.source = source;
      }
      FirstOperator.prototype.call = function (observer, source) {
          return source._subscribe(new FirstSubscriber(observer, this.predicate, this.resultSelector, this.defaultValue, this.source));
      };
      return FirstOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var FirstSubscriber = (function (_super) {
      __extends(FirstSubscriber, _super);
      function FirstSubscriber(destination, predicate, resultSelector, defaultValue, source) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.resultSelector = resultSelector;
          this.defaultValue = defaultValue;
          this.source = source;
          this.index = 0;
          this.hasCompleted = false;
      }
      FirstSubscriber.prototype._next = function (value) {
          var index = this.index++;
          if (this.predicate) {
              this._tryPredicate(value, index);
          }
          else {
              this._emit(value, index);
          }
      };
      FirstSubscriber.prototype._tryPredicate = function (value, index) {
          var result;
          try {
              result = this.predicate(value, index, this.source);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          if (result) {
              this._emit(value, index);
          }
      };
      FirstSubscriber.prototype._emit = function (value, index) {
          if (this.resultSelector) {
              this._tryResultSelector(value, index);
              return;
          }
          this._emitFinal(value);
      };
      FirstSubscriber.prototype._tryResultSelector = function (value, index) {
          var result;
          try {
              result = this.resultSelector(value, index);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this._emitFinal(result);
      };
      FirstSubscriber.prototype._emitFinal = function (value) {
          var destination = this.destination;
          destination.next(value);
          destination.complete();
          this.hasCompleted = true;
      };
      FirstSubscriber.prototype._complete = function () {
          var destination = this.destination;
          if (!this.hasCompleted && typeof this.defaultValue !== 'undefined') {
              destination.next(this.defaultValue);
              destination.complete();
          }
          else if (!this.hasCompleted) {
              destination.error(new EmptyError_1.EmptyError);
          }
      };
      return FirstSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=first.js.map

/***/ },
/* 308 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var Subscription_1 = __webpack_require__(6);
  var Observable_1 = __webpack_require__(1);
  var Subject_1 = __webpack_require__(5);
  var Map_1 = __webpack_require__(374);
  var FastMap_1 = __webpack_require__(372);
  /* tslint:disable:max-line-length */
  function groupBy(keySelector, elementSelector, durationSelector) {
      return this.lift(new GroupByOperator(this, keySelector, elementSelector, durationSelector));
  }
  exports.groupBy = groupBy;
  var GroupByOperator = (function () {
      function GroupByOperator(source, keySelector, elementSelector, durationSelector) {
          this.source = source;
          this.keySelector = keySelector;
          this.elementSelector = elementSelector;
          this.durationSelector = durationSelector;
      }
      GroupByOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new GroupBySubscriber(subscriber, this.keySelector, this.elementSelector, this.durationSelector));
      };
      return GroupByOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var GroupBySubscriber = (function (_super) {
      __extends(GroupBySubscriber, _super);
      function GroupBySubscriber(destination, keySelector, elementSelector, durationSelector) {
          _super.call(this, destination);
          this.keySelector = keySelector;
          this.elementSelector = elementSelector;
          this.durationSelector = durationSelector;
          this.groups = null;
          this.attemptedToUnsubscribe = false;
          this.count = 0;
      }
      GroupBySubscriber.prototype._next = function (value) {
          var key;
          try {
              key = this.keySelector(value);
          }
          catch (err) {
              this.error(err);
              return;
          }
          this._group(value, key);
      };
      GroupBySubscriber.prototype._group = function (value, key) {
          var groups = this.groups;
          if (!groups) {
              groups = this.groups = typeof key === 'string' ? new FastMap_1.FastMap() : new Map_1.Map();
          }
          var group = groups.get(key);
          var element;
          if (this.elementSelector) {
              try {
                  element = this.elementSelector(value);
              }
              catch (err) {
                  this.error(err);
              }
          }
          else {
              element = value;
          }
          if (!group) {
              groups.set(key, group = new Subject_1.Subject());
              var groupedObservable = new GroupedObservable(key, group, this);
              this.destination.next(groupedObservable);
              if (this.durationSelector) {
                  var duration = void 0;
                  try {
                      duration = this.durationSelector(new GroupedObservable(key, group));
                  }
                  catch (err) {
                      this.error(err);
                      return;
                  }
                  this.add(duration.subscribe(new GroupDurationSubscriber(key, group, this)));
              }
          }
          if (!group.closed) {
              group.next(element);
          }
      };
      GroupBySubscriber.prototype._error = function (err) {
          var groups = this.groups;
          if (groups) {
              groups.forEach(function (group, key) {
                  group.error(err);
              });
              groups.clear();
          }
          this.destination.error(err);
      };
      GroupBySubscriber.prototype._complete = function () {
          var groups = this.groups;
          if (groups) {
              groups.forEach(function (group, key) {
                  group.complete();
              });
              groups.clear();
          }
          this.destination.complete();
      };
      GroupBySubscriber.prototype.removeGroup = function (key) {
          this.groups.delete(key);
      };
      GroupBySubscriber.prototype.unsubscribe = function () {
          if (!this.closed && !this.attemptedToUnsubscribe) {
              this.attemptedToUnsubscribe = true;
              if (this.count === 0) {
                  _super.prototype.unsubscribe.call(this);
              }
          }
      };
      return GroupBySubscriber;
  }(Subscriber_1.Subscriber));
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var GroupDurationSubscriber = (function (_super) {
      __extends(GroupDurationSubscriber, _super);
      function GroupDurationSubscriber(key, group, parent) {
          _super.call(this);
          this.key = key;
          this.group = group;
          this.parent = parent;
      }
      GroupDurationSubscriber.prototype._next = function (value) {
          this._complete();
      };
      GroupDurationSubscriber.prototype._error = function (err) {
          var group = this.group;
          if (!group.closed) {
              group.error(err);
          }
          this.parent.removeGroup(this.key);
      };
      GroupDurationSubscriber.prototype._complete = function () {
          var group = this.group;
          if (!group.closed) {
              group.complete();
          }
          this.parent.removeGroup(this.key);
      };
      return GroupDurationSubscriber;
  }(Subscriber_1.Subscriber));
  /**
   * An Observable representing values belonging to the same group represented by
   * a common key. The values emitted by a GroupedObservable come from the source
   * Observable. The common key is available as the field `key` on a
   * GroupedObservable instance.
   *
   * @class GroupedObservable<K, T>
   */
  var GroupedObservable = (function (_super) {
      __extends(GroupedObservable, _super);
      function GroupedObservable(key, groupSubject, refCountSubscription) {
          _super.call(this);
          this.key = key;
          this.groupSubject = groupSubject;
          this.refCountSubscription = refCountSubscription;
      }
      GroupedObservable.prototype._subscribe = function (subscriber) {
          var subscription = new Subscription_1.Subscription();
          var _a = this, refCountSubscription = _a.refCountSubscription, groupSubject = _a.groupSubject;
          if (refCountSubscription && !refCountSubscription.closed) {
              subscription.add(new InnerRefCountSubscription(refCountSubscription));
          }
          subscription.add(groupSubject.subscribe(subscriber));
          return subscription;
      };
      return GroupedObservable;
  }(Observable_1.Observable));
  exports.GroupedObservable = GroupedObservable;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var InnerRefCountSubscription = (function (_super) {
      __extends(InnerRefCountSubscription, _super);
      function InnerRefCountSubscription(parent) {
          _super.call(this);
          this.parent = parent;
          parent.count++;
      }
      InnerRefCountSubscription.prototype.unsubscribe = function () {
          var parent = this.parent;
          if (!parent.closed && !this.closed) {
              _super.prototype.unsubscribe.call(this);
              parent.count -= 1;
              if (parent.count === 0 && parent.attemptedToUnsubscribe) {
                  parent.unsubscribe();
              }
          }
      };
      return InnerRefCountSubscription;
  }(Subscription_1.Subscription));
  //# sourceMappingURL=groupBy.js.map

/***/ },
/* 309 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var noop_1 = __webpack_require__(78);
  /**
   * Ignores all items emitted by the source Observable and only passes calls of `complete` or `error`.
   *
   * <img src="./img/ignoreElements.png" width="100%">
   *
   * @return {Observable} an empty Observable that only calls `complete`
   * or `error`, based on which one is called by the source Observable.
   * @method ignoreElements
   * @owner Observable
   */
  function ignoreElements() {
      return this.lift(new IgnoreElementsOperator());
  }
  exports.ignoreElements = ignoreElements;
  ;
  var IgnoreElementsOperator = (function () {
      function IgnoreElementsOperator() {
      }
      IgnoreElementsOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new IgnoreElementsSubscriber(subscriber));
      };
      return IgnoreElementsOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var IgnoreElementsSubscriber = (function (_super) {
      __extends(IgnoreElementsSubscriber, _super);
      function IgnoreElementsSubscriber() {
          _super.apply(this, arguments);
      }
      IgnoreElementsSubscriber.prototype._next = function (unused) {
          noop_1.noop();
      };
      return IgnoreElementsSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=ignoreElements.js.map

/***/ },
/* 310 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * If the source Observable is empty it returns an Observable that emits true, otherwise it emits false.
   *
   * <img src="./img/isEmpty.png" width="100%">
   *
   * @return {Observable} an Observable that emits a Boolean.
   * @method isEmpty
   * @owner Observable
   */
  function isEmpty() {
      return this.lift(new IsEmptyOperator());
  }
  exports.isEmpty = isEmpty;
  var IsEmptyOperator = (function () {
      function IsEmptyOperator() {
      }
      IsEmptyOperator.prototype.call = function (observer, source) {
          return source._subscribe(new IsEmptySubscriber(observer));
      };
      return IsEmptyOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var IsEmptySubscriber = (function (_super) {
      __extends(IsEmptySubscriber, _super);
      function IsEmptySubscriber(destination) {
          _super.call(this, destination);
      }
      IsEmptySubscriber.prototype.notifyComplete = function (isEmpty) {
          var destination = this.destination;
          destination.next(isEmpty);
          destination.complete();
      };
      IsEmptySubscriber.prototype._next = function (value) {
          this.notifyComplete(false);
      };
      IsEmptySubscriber.prototype._complete = function () {
          this.notifyComplete(true);
      };
      return IsEmptySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=isEmpty.js.map

/***/ },
/* 311 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var EmptyError_1 = __webpack_require__(30);
  /* tslint:disable:max-line-length */
  function last(predicate, resultSelector, defaultValue) {
      return this.lift(new LastOperator(predicate, resultSelector, defaultValue, this));
  }
  exports.last = last;
  var LastOperator = (function () {
      function LastOperator(predicate, resultSelector, defaultValue, source) {
          this.predicate = predicate;
          this.resultSelector = resultSelector;
          this.defaultValue = defaultValue;
          this.source = source;
      }
      LastOperator.prototype.call = function (observer, source) {
          return source._subscribe(new LastSubscriber(observer, this.predicate, this.resultSelector, this.defaultValue, this.source));
      };
      return LastOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var LastSubscriber = (function (_super) {
      __extends(LastSubscriber, _super);
      function LastSubscriber(destination, predicate, resultSelector, defaultValue, source) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.resultSelector = resultSelector;
          this.defaultValue = defaultValue;
          this.source = source;
          this.hasValue = false;
          this.index = 0;
          if (typeof defaultValue !== 'undefined') {
              this.lastValue = defaultValue;
              this.hasValue = true;
          }
      }
      LastSubscriber.prototype._next = function (value) {
          var index = this.index++;
          if (this.predicate) {
              this._tryPredicate(value, index);
          }
          else {
              if (this.resultSelector) {
                  this._tryResultSelector(value, index);
                  return;
              }
              this.lastValue = value;
              this.hasValue = true;
          }
      };
      LastSubscriber.prototype._tryPredicate = function (value, index) {
          var result;
          try {
              result = this.predicate(value, index, this.source);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          if (result) {
              if (this.resultSelector) {
                  this._tryResultSelector(value, index);
                  return;
              }
              this.lastValue = value;
              this.hasValue = true;
          }
      };
      LastSubscriber.prototype._tryResultSelector = function (value, index) {
          var result;
          try {
              result = this.resultSelector(value, index);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.lastValue = result;
          this.hasValue = true;
      };
      LastSubscriber.prototype._complete = function () {
          var destination = this.destination;
          if (this.hasValue) {
              destination.next(this.lastValue);
              destination.complete();
          }
          else {
              destination.error(new EmptyError_1.EmptyError);
          }
      };
      return LastSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=last.js.map

/***/ },
/* 312 */
/***/ function(module, exports) {

  "use strict";
  /**
   * @param func
   * @return {Observable<R>}
   * @method let
   * @owner Observable
   */
  function letProto(func) {
      return func(this);
  }
  exports.letProto = letProto;
  //# sourceMappingURL=let.js.map

/***/ },
/* 313 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Emits the given constant value on the output Observable every time the source
   * Observable emits a value.
   *
   * <span class="informal">Like {@link map}, but it maps every source value to
   * the same output value every time.</span>
   *
   * <img src="./img/mapTo.png" width="100%">
   *
   * Takes a constant `value` as argument, and emits that whenever the source
   * Observable emits a value. In other words, ignores the actual source value,
   * and simply uses the emission moment to know when to emit the given `value`.
   *
   * @example <caption>Map every every click to the string 'Hi'</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var greetings = clicks.mapTo('Hi');
   * greetings.subscribe(x => console.log(x));
   *
   * @see {@link map}
   *
   * @param {any} value The value to map each source value to.
   * @return {Observable} An Observable that emits the given `value` every time
   * the source Observable emits something.
   * @method mapTo
   * @owner Observable
   */
  function mapTo(value) {
      return this.lift(new MapToOperator(value));
  }
  exports.mapTo = mapTo;
  var MapToOperator = (function () {
      function MapToOperator(value) {
          this.value = value;
      }
      MapToOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new MapToSubscriber(subscriber, this.value));
      };
      return MapToOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MapToSubscriber = (function (_super) {
      __extends(MapToSubscriber, _super);
      function MapToSubscriber(destination, value) {
          _super.call(this, destination);
          this.value = value;
      }
      MapToSubscriber.prototype._next = function (x) {
          this.destination.next(this.value);
      };
      return MapToSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=mapTo.js.map

/***/ },
/* 314 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var Notification_1 = __webpack_require__(20);
  /**
   * Represents all of the notifications from the source Observable as `next`
   * emissions marked with their original types within {@link Notification}
   * objects.
   *
   * <span class="informal">Wraps `next`, `error` and `complete` emissions in
   * {@link Notification} objects, emitted as `next` on the output Observable.
   * </span>
   *
   * <img src="./img/materialize.png" width="100%">
   *
   * `materialize` returns an Observable that emits a `next` notification for each
   * `next`, `error`, or `complete` emission of the source Observable. When the
   * source Observable emits `complete`, the output Observable will emit `next` as
   * a Notification of type "complete", and then it will emit `complete` as well.
   * When the source Observable emits `error`, the output will emit `next` as a
   * Notification of type "error", and then `complete`.
   *
   * This operator is useful for producing metadata of the source Observable, to
   * be consumed as `next` emissions. Use it in conjunction with
   * {@link dematerialize}.
   *
   * @example <caption>Convert a faulty Observable to an Observable of Notifications</caption>
   * var letters = Rx.Observable.of('a', 'b', 13, 'd');
   * var upperCase = letters.map(x => x.toUpperCase());
   * var materialized = upperCase.materialize();
   * materialized.subscribe(x => console.log(x));
   *
   * @see {@link Notification}
   * @see {@link dematerialize}
   *
   * @return {Observable<Notification<T>>} An Observable that emits
   * {@link Notification} objects that wrap the original emissions from the source
   * Observable with metadata.
   * @method materialize
   * @owner Observable
   */
  function materialize() {
      return this.lift(new MaterializeOperator());
  }
  exports.materialize = materialize;
  var MaterializeOperator = (function () {
      function MaterializeOperator() {
      }
      MaterializeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new MaterializeSubscriber(subscriber));
      };
      return MaterializeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MaterializeSubscriber = (function (_super) {
      __extends(MaterializeSubscriber, _super);
      function MaterializeSubscriber(destination) {
          _super.call(this, destination);
      }
      MaterializeSubscriber.prototype._next = function (value) {
          this.destination.next(Notification_1.Notification.createNext(value));
      };
      MaterializeSubscriber.prototype._error = function (err) {
          var destination = this.destination;
          destination.next(Notification_1.Notification.createError(err));
          destination.complete();
      };
      MaterializeSubscriber.prototype._complete = function () {
          var destination = this.destination;
          destination.next(Notification_1.Notification.createComplete());
          destination.complete();
      };
      return MaterializeSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=materialize.js.map

/***/ },
/* 315 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var reduce_1 = __webpack_require__(41);
  /**
   * The Max operator operates on an Observable that emits numbers (or items that can be evaluated as numbers),
   * and when source Observable completes it emits a single item: the item with the largest number.
   *
   * <img src="./img/max.png" width="100%">
   *
   * @param {Function} optional comparer function that it will use instead of its default to compare the value of two
   * items.
   * @return {Observable} an Observable that emits item with the largest number.
   * @method max
   * @owner Observable
   */
  function max(comparer) {
      var max = (typeof comparer === 'function')
          ? function (x, y) { return comparer(x, y) > 0 ? x : y; }
          : function (x, y) { return x > y ? x : y; };
      return this.lift(new reduce_1.ReduceOperator(max));
  }
  exports.max = max;
  //# sourceMappingURL=max.js.map

/***/ },
/* 316 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var subscribeToResult_1 = __webpack_require__(4);
  var OuterSubscriber_1 = __webpack_require__(3);
  /**
   * @param project
   * @param seed
   * @param concurrent
   * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
   * @method mergeScan
   * @owner Observable
   */
  function mergeScan(project, seed, concurrent) {
      if (concurrent === void 0) { concurrent = Number.POSITIVE_INFINITY; }
      return this.lift(new MergeScanOperator(project, seed, concurrent));
  }
  exports.mergeScan = mergeScan;
  var MergeScanOperator = (function () {
      function MergeScanOperator(project, seed, concurrent) {
          this.project = project;
          this.seed = seed;
          this.concurrent = concurrent;
      }
      MergeScanOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new MergeScanSubscriber(subscriber, this.project, this.seed, this.concurrent));
      };
      return MergeScanOperator;
  }());
  exports.MergeScanOperator = MergeScanOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var MergeScanSubscriber = (function (_super) {
      __extends(MergeScanSubscriber, _super);
      function MergeScanSubscriber(destination, project, acc, concurrent) {
          _super.call(this, destination);
          this.project = project;
          this.acc = acc;
          this.concurrent = concurrent;
          this.hasValue = false;
          this.hasCompleted = false;
          this.buffer = [];
          this.active = 0;
          this.index = 0;
      }
      MergeScanSubscriber.prototype._next = function (value) {
          if (this.active < this.concurrent) {
              var index = this.index++;
              var ish = tryCatch_1.tryCatch(this.project)(this.acc, value);
              var destination = this.destination;
              if (ish === errorObject_1.errorObject) {
                  destination.error(errorObject_1.errorObject.e);
              }
              else {
                  this.active++;
                  this._innerSub(ish, value, index);
              }
          }
          else {
              this.buffer.push(value);
          }
      };
      MergeScanSubscriber.prototype._innerSub = function (ish, value, index) {
          this.add(subscribeToResult_1.subscribeToResult(this, ish, value, index));
      };
      MergeScanSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (this.active === 0 && this.buffer.length === 0) {
              if (this.hasValue === false) {
                  this.destination.next(this.acc);
              }
              this.destination.complete();
          }
      };
      MergeScanSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var destination = this.destination;
          this.acc = innerValue;
          this.hasValue = true;
          destination.next(innerValue);
      };
      MergeScanSubscriber.prototype.notifyComplete = function (innerSub) {
          var buffer = this.buffer;
          this.remove(innerSub);
          this.active--;
          if (buffer.length > 0) {
              this._next(buffer.shift());
          }
          else if (this.active === 0 && this.hasCompleted) {
              if (this.hasValue === false) {
                  this.destination.next(this.acc);
              }
              this.destination.complete();
          }
      };
      return MergeScanSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  exports.MergeScanSubscriber = MergeScanSubscriber;
  //# sourceMappingURL=mergeScan.js.map

/***/ },
/* 317 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var reduce_1 = __webpack_require__(41);
  /**
   * The Min operator operates on an Observable that emits numbers (or items that can be evaluated as numbers),
   * and when source Observable completes it emits a single item: the item with the smallest number.
   *
   * <img src="./img/min.png" width="100%">
   *
   * @param {Function} optional comparer function that it will use instead of its default to compare the value of two items.
   * @return {Observable<R>} an Observable that emits item with the smallest number.
   * @method min
   * @owner Observable
   */
  function min(comparer) {
      var min = (typeof comparer === 'function')
          ? function (x, y) { return comparer(x, y) < 0 ? x : y; }
          : function (x, y) { return x < y ? x : y; };
      return this.lift(new reduce_1.ReduceOperator(min));
  }
  exports.min = min;
  //# sourceMappingURL=min.js.map

/***/ },
/* 318 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Groups pairs of consecutive emissions together and emits them as an array of
   * two values.
   *
   * <span class="informal">Puts the current value and previous value together as
   * an array, and emits that.</span>
   *
   * <img src="./img/pairwise.png" width="100%">
   *
   * The Nth emission from the source Observable will cause the output Observable
   * to emit an array [(N-1)th, Nth] of the previous and the current value, as a
   * pair. For this reason, `pairwise` emits on the second and subsequent
   * emissions from the source Observable, but not on the first emission, because
   * there is no previous value in that case.
   *
   * @example <caption>On every click (starting from the second), emit the relative distance to the previous click</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var pairs = clicks.pairwise();
   * var distance = pairs.map(pair => {
   *   var x0 = pair[0].clientX;
   *   var y0 = pair[0].clientY;
   *   var x1 = pair[1].clientX;
   *   var y1 = pair[1].clientY;
   *   return Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));
   * });
   * distance.subscribe(x => console.log(x));
   *
   * @see {@link buffer}
   * @see {@link bufferCount}
   *
   * @return {Observable<Array<T>>} An Observable of pairs (as arrays) of
   * consecutive values from the source Observable.
   * @method pairwise
   * @owner Observable
   */
  function pairwise() {
      return this.lift(new PairwiseOperator());
  }
  exports.pairwise = pairwise;
  var PairwiseOperator = (function () {
      function PairwiseOperator() {
      }
      PairwiseOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new PairwiseSubscriber(subscriber));
      };
      return PairwiseOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var PairwiseSubscriber = (function (_super) {
      __extends(PairwiseSubscriber, _super);
      function PairwiseSubscriber(destination) {
          _super.call(this, destination);
          this.hasPrev = false;
      }
      PairwiseSubscriber.prototype._next = function (value) {
          if (this.hasPrev) {
              this.destination.next([this.prev, value]);
          }
          else {
              this.hasPrev = true;
          }
          this.prev = value;
      };
      return PairwiseSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=pairwise.js.map

/***/ },
/* 319 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var not_1 = __webpack_require__(378);
  var filter_1 = __webpack_require__(60);
  /**
   * Splits the source Observable into two, one with values that satisfy a
   * predicate, and another with values that don't satisfy the predicate.
   *
   * <span class="informal">It's like {@link filter}, but returns two Observables:
   * one like the output of {@link filter}, and the other with values that did not
   * pass the condition.</span>
   *
   * <img src="./img/partition.png" width="100%">
   *
   * `partition` outputs an array with two Observables that partition the values
   * from the source Observable through the given `predicate` function. The first
   * Observable in that array emits source values for which the predicate argument
   * returns true. The second Observable emits source values for which the
   * predicate returns false. The first behaves like {@link filter} and the second
   * behaves like {@link filter} with the predicate negated.
   *
   * @example <caption>Partition click events into those on DIV elements and those elsewhere</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var parts = clicks.partition(ev => ev.target.tagName === 'DIV');
   * var clicksOnDivs = parts[0];
   * var clicksElsewhere = parts[1];
   * clicksOnDivs.subscribe(x => console.log('DIV clicked: ', x));
   * clicksElsewhere.subscribe(x => console.log('Other clicked: ', x));
   *
   * @see {@link filter}
   *
   * @param {function(value: T, index: number): boolean} predicate A function that
   * evaluates each value emitted by the source Observable. If it returns `true`,
   * the value is emitted on the first Observable in the returned array, if
   * `false` the value is emitted on the second Observable in the array. The
   * `index` parameter is the number `i` for the i-th source emission that has
   * happened since the subscription, starting from the number `0`.
   * @param {any} [thisArg] An optional argument to determine the value of `this`
   * in the `predicate` function.
   * @return {[Observable<T>, Observable<T>]} An array with two Observables: one
   * with values that passed the predicate, and another with values that did not
   * pass the predicate.
   * @method partition
   * @owner Observable
   */
  function partition(predicate, thisArg) {
      return [
          filter_1.filter.call(this, predicate),
          filter_1.filter.call(this, not_1.not(predicate, thisArg))
      ];
  }
  exports.partition = partition;
  //# sourceMappingURL=partition.js.map

/***/ },
/* 320 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var map_1 = __webpack_require__(39);
  /**
   * Maps each source value (an object) to its specified nested property.
   *
   * <span class="informal">Like {@link map}, but meant only for picking one of
   * the nested properties of every emitted object.</span>
   *
   * <img src="./img/pluck.png" width="100%">
   *
   * Given a list of strings describing a path to an object property, retrieves
   * the value of a specified nested property from all values in the source
   * Observable. If a property can't be resolved, it will return `undefined` for
   * that value.
   *
   * @example <caption>Map every every click to the tagName of the clicked target element</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var tagNames = clicks.pluck('target', 'tagName');
   * tagNames.subscribe(x => console.log(x));
   *
   * @see {@link map}
   *
   * @param {...string} properties The nested properties to pluck from each source
   * value (an object).
   * @return {Observable} Returns a new Observable of property values from the
   * source values.
   * @method pluck
   * @owner Observable
   */
  function pluck() {
      var properties = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          properties[_i - 0] = arguments[_i];
      }
      var length = properties.length;
      if (length === 0) {
          throw new Error('list of properties cannot be empty.');
      }
      return map_1.map.call(this, plucker(properties, length));
  }
  exports.pluck = pluck;
  function plucker(props, length) {
      var mapper = function (x) {
          var currentProp = x;
          for (var i = 0; i < length; i++) {
              var p = currentProp[props[i]];
              if (typeof p !== 'undefined') {
                  currentProp = p;
              }
              else {
                  return undefined;
              }
          }
          return currentProp;
      };
      return mapper;
  }
  //# sourceMappingURL=pluck.js.map

/***/ },
/* 321 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Subject_1 = __webpack_require__(5);
  var multicast_1 = __webpack_require__(17);
  /* tslint:disable:max-line-length */
  function publish(selector) {
      return selector ? multicast_1.multicast.call(this, function () { return new Subject_1.Subject(); }, selector) :
          multicast_1.multicast.call(this, new Subject_1.Subject());
  }
  exports.publish = publish;
  //# sourceMappingURL=publish.js.map

/***/ },
/* 322 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var BehaviorSubject_1 = __webpack_require__(52);
  var multicast_1 = __webpack_require__(17);
  /**
   * @param value
   * @return {ConnectableObservable<T>}
   * @method publishBehavior
   * @owner Observable
   */
  function publishBehavior(value) {
      return multicast_1.multicast.call(this, new BehaviorSubject_1.BehaviorSubject(value));
  }
  exports.publishBehavior = publishBehavior;
  //# sourceMappingURL=publishBehavior.js.map

/***/ },
/* 323 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var AsyncSubject_1 = __webpack_require__(25);
  var multicast_1 = __webpack_require__(17);
  /**
   * @return {ConnectableObservable<T>}
   * @method publishLast
   * @owner Observable
   */
  function publishLast() {
      return multicast_1.multicast.call(this, new AsyncSubject_1.AsyncSubject());
  }
  exports.publishLast = publishLast;
  //# sourceMappingURL=publishLast.js.map

/***/ },
/* 324 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ReplaySubject_1 = __webpack_require__(35);
  var multicast_1 = __webpack_require__(17);
  /**
   * @param bufferSize
   * @param windowTime
   * @param scheduler
   * @return {ConnectableObservable<T>}
   * @method publishReplay
   * @owner Observable
   */
  function publishReplay(bufferSize, windowTime, scheduler) {
      if (bufferSize === void 0) { bufferSize = Number.POSITIVE_INFINITY; }
      if (windowTime === void 0) { windowTime = Number.POSITIVE_INFINITY; }
      return multicast_1.multicast.call(this, new ReplaySubject_1.ReplaySubject(bufferSize, windowTime, scheduler));
  }
  exports.publishReplay = publishReplay;
  //# sourceMappingURL=publishReplay.js.map

/***/ },
/* 325 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var EmptyObservable_1 = __webpack_require__(14);
  /**
   * Returns an Observable that repeats the stream of items emitted by the source Observable at most count times,
   * on a particular Scheduler.
   *
   * <img src="./img/repeat.png" width="100%">
   *
   * @param {Scheduler} [scheduler] the Scheduler to emit the items on.
   * @param {number} [count] the number of times the source Observable items are repeated, a count of 0 will yield
   * an empty Observable.
   * @return {Observable} an Observable that repeats the stream of items emitted by the source Observable at most
   * count times.
   * @method repeat
   * @owner Observable
   */
  function repeat(count) {
      if (count === void 0) { count = -1; }
      if (count === 0) {
          return new EmptyObservable_1.EmptyObservable();
      }
      else if (count < 0) {
          return this.lift(new RepeatOperator(-1, this));
      }
      else {
          return this.lift(new RepeatOperator(count - 1, this));
      }
  }
  exports.repeat = repeat;
  var RepeatOperator = (function () {
      function RepeatOperator(count, source) {
          this.count = count;
          this.source = source;
      }
      RepeatOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new RepeatSubscriber(subscriber, this.count, this.source));
      };
      return RepeatOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var RepeatSubscriber = (function (_super) {
      __extends(RepeatSubscriber, _super);
      function RepeatSubscriber(destination, count, source) {
          _super.call(this, destination);
          this.count = count;
          this.source = source;
      }
      RepeatSubscriber.prototype.complete = function () {
          if (!this.isStopped) {
              var _a = this, source = _a.source, count = _a.count;
              if (count === 0) {
                  return _super.prototype.complete.call(this);
              }
              else if (count > -1) {
                  this.count = count - 1;
              }
              this.unsubscribe();
              this.isStopped = false;
              this.closed = false;
              source.subscribe(this);
          }
      };
      return RepeatSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=repeat.js.map

/***/ },
/* 326 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Returns an Observable that emits the same values as the source observable with the exception of a `complete`.
   * A `complete` will cause the emission of the Throwable that cause the complete to the Observable returned from
   * notificationHandler. If that Observable calls onComplete or `complete` then retry will call `complete` or `error`
   * on the child subscription. Otherwise, this Observable will resubscribe to the source observable, on a particular
   * Scheduler.
   *
   * <img src="./img/repeatWhen.png" width="100%">
   *
   * @param {notificationHandler} receives an Observable of notifications with which a user can `complete` or `error`,
   * aborting the retry.
   * @param {scheduler} the Scheduler on which to subscribe to the source Observable.
   * @return {Observable} the source Observable modified with retry logic.
   * @method repeatWhen
   * @owner Observable
   */
  function repeatWhen(notifier) {
      return this.lift(new RepeatWhenOperator(notifier, this));
  }
  exports.repeatWhen = repeatWhen;
  var RepeatWhenOperator = (function () {
      function RepeatWhenOperator(notifier, source) {
          this.notifier = notifier;
          this.source = source;
      }
      RepeatWhenOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new RepeatWhenSubscriber(subscriber, this.notifier, this.source));
      };
      return RepeatWhenOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var RepeatWhenSubscriber = (function (_super) {
      __extends(RepeatWhenSubscriber, _super);
      function RepeatWhenSubscriber(destination, notifier, source) {
          _super.call(this, destination);
          this.notifier = notifier;
          this.source = source;
      }
      RepeatWhenSubscriber.prototype.complete = function () {
          if (!this.isStopped) {
              var notifications = this.notifications;
              var retries = this.retries;
              var retriesSubscription = this.retriesSubscription;
              if (!retries) {
                  notifications = new Subject_1.Subject();
                  retries = tryCatch_1.tryCatch(this.notifier)(notifications);
                  if (retries === errorObject_1.errorObject) {
                      return _super.prototype.complete.call(this);
                  }
                  retriesSubscription = subscribeToResult_1.subscribeToResult(this, retries);
              }
              else {
                  this.notifications = null;
                  this.retriesSubscription = null;
              }
              this.unsubscribe();
              this.closed = false;
              this.notifications = notifications;
              this.retries = retries;
              this.retriesSubscription = retriesSubscription;
              notifications.next();
          }
      };
      RepeatWhenSubscriber.prototype._unsubscribe = function () {
          var _a = this, notifications = _a.notifications, retriesSubscription = _a.retriesSubscription;
          if (notifications) {
              notifications.unsubscribe();
              this.notifications = null;
          }
          if (retriesSubscription) {
              retriesSubscription.unsubscribe();
              this.retriesSubscription = null;
          }
          this.retries = null;
      };
      RepeatWhenSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var _a = this, notifications = _a.notifications, retries = _a.retries, retriesSubscription = _a.retriesSubscription;
          this.notifications = null;
          this.retries = null;
          this.retriesSubscription = null;
          this.unsubscribe();
          this.isStopped = false;
          this.closed = false;
          this.notifications = notifications;
          this.retries = retries;
          this.retriesSubscription = retriesSubscription;
          this.source.subscribe(this);
      };
      return RepeatWhenSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=repeatWhen.js.map

/***/ },
/* 327 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Returns an Observable that mirrors the source Observable, resubscribing to it if it calls `error` and the
   * predicate returns true for that specific exception and retry count.
   * If the source Observable calls `error`, this method will resubscribe to the source Observable for a maximum of
   * count resubscriptions (given as a number parameter) rather than propagating the `error` call.
   *
   * <img src="./img/retry.png" width="100%">
   *
   * Any and all items emitted by the source Observable will be emitted by the resulting Observable, even those emitted
   * during failed subscriptions. For example, if an Observable fails at first but emits [1, 2] then succeeds the second
   * time and emits: [1, 2, 3, 4, 5] then the complete stream of emissions and notifications
   * would be: [1, 2, 1, 2, 3, 4, 5, `complete`].
   * @param {number} number of retry attempts before failing.
   * @return {Observable} the source Observable modified with the retry logic.
   * @method retry
   * @owner Observable
   */
  function retry(count) {
      if (count === void 0) { count = -1; }
      return this.lift(new RetryOperator(count, this));
  }
  exports.retry = retry;
  var RetryOperator = (function () {
      function RetryOperator(count, source) {
          this.count = count;
          this.source = source;
      }
      RetryOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new RetrySubscriber(subscriber, this.count, this.source));
      };
      return RetryOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var RetrySubscriber = (function (_super) {
      __extends(RetrySubscriber, _super);
      function RetrySubscriber(destination, count, source) {
          _super.call(this, destination);
          this.count = count;
          this.source = source;
      }
      RetrySubscriber.prototype.error = function (err) {
          if (!this.isStopped) {
              var _a = this, source = _a.source, count = _a.count;
              if (count === 0) {
                  return _super.prototype.error.call(this, err);
              }
              else if (count > -1) {
                  this.count = count - 1;
              }
              this.unsubscribe();
              this.isStopped = false;
              this.closed = false;
              source.subscribe(this);
          }
      };
      return RetrySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=retry.js.map

/***/ },
/* 328 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Returns an Observable that emits the same values as the source observable with the exception of an `error`.
   * An `error` will cause the emission of the Throwable that cause the error to the Observable returned from
   * notificationHandler. If that Observable calls onComplete or `error` then retry will call `complete` or `error`
   * on the child subscription. Otherwise, this Observable will resubscribe to the source observable, on a particular
   * Scheduler.
   *
   * <img src="./img/retryWhen.png" width="100%">
   *
   * @param {notificationHandler} receives an Observable of notifications with which a user can `complete` or `error`,
   * aborting the retry.
   * @param {scheduler} the Scheduler on which to subscribe to the source Observable.
   * @return {Observable} the source Observable modified with retry logic.
   * @method retryWhen
   * @owner Observable
   */
  function retryWhen(notifier) {
      return this.lift(new RetryWhenOperator(notifier, this));
  }
  exports.retryWhen = retryWhen;
  var RetryWhenOperator = (function () {
      function RetryWhenOperator(notifier, source) {
          this.notifier = notifier;
          this.source = source;
      }
      RetryWhenOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new RetryWhenSubscriber(subscriber, this.notifier, this.source));
      };
      return RetryWhenOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var RetryWhenSubscriber = (function (_super) {
      __extends(RetryWhenSubscriber, _super);
      function RetryWhenSubscriber(destination, notifier, source) {
          _super.call(this, destination);
          this.notifier = notifier;
          this.source = source;
      }
      RetryWhenSubscriber.prototype.error = function (err) {
          if (!this.isStopped) {
              var errors = this.errors;
              var retries = this.retries;
              var retriesSubscription = this.retriesSubscription;
              if (!retries) {
                  errors = new Subject_1.Subject();
                  retries = tryCatch_1.tryCatch(this.notifier)(errors);
                  if (retries === errorObject_1.errorObject) {
                      return _super.prototype.error.call(this, errorObject_1.errorObject.e);
                  }
                  retriesSubscription = subscribeToResult_1.subscribeToResult(this, retries);
              }
              else {
                  this.errors = null;
                  this.retriesSubscription = null;
              }
              this.unsubscribe();
              this.closed = false;
              this.errors = errors;
              this.retries = retries;
              this.retriesSubscription = retriesSubscription;
              errors.next(err);
          }
      };
      RetryWhenSubscriber.prototype._unsubscribe = function () {
          var _a = this, errors = _a.errors, retriesSubscription = _a.retriesSubscription;
          if (errors) {
              errors.unsubscribe();
              this.errors = null;
          }
          if (retriesSubscription) {
              retriesSubscription.unsubscribe();
              this.retriesSubscription = null;
          }
          this.retries = null;
      };
      RetryWhenSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var _a = this, errors = _a.errors, retries = _a.retries, retriesSubscription = _a.retriesSubscription;
          this.errors = null;
          this.retries = null;
          this.retriesSubscription = null;
          this.unsubscribe();
          this.isStopped = false;
          this.closed = false;
          this.errors = errors;
          this.retries = retries;
          this.retriesSubscription = retriesSubscription;
          this.source.subscribe(this);
      };
      return RetryWhenSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=retryWhen.js.map

/***/ },
/* 329 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Emits the most recently emitted value from the source Observable whenever
   * another Observable, the `notifier`, emits.
   *
   * <span class="informal">It's like {@link sampleTime}, but samples whenever
   * the `notifier` Observable emits something.</span>
   *
   * <img src="./img/sample.png" width="100%">
   *
   * Whenever the `notifier` Observable emits a value or completes, `sample`
   * looks at the source Observable and emits whichever value it has most recently
   * emitted since the previous sampling, unless the source has not emitted
   * anything since the previous sampling. The `notifier` is subscribed to as soon
   * as the output Observable is subscribed.
   *
   * @example <caption>On every click, sample the most recent "seconds" timer</caption>
   * var seconds = Rx.Observable.interval(1000);
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = seconds.sample(clicks);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link audit}
   * @see {@link debounce}
   * @see {@link sampleTime}
   * @see {@link throttle}
   *
   * @param {Observable<any>} notifier The Observable to use for sampling the
   * source Observable.
   * @return {Observable<T>} An Observable that emits the results of sampling the
   * values emitted by the source Observable whenever the notifier Observable
   * emits value or completes.
   * @method sample
   * @owner Observable
   */
  function sample(notifier) {
      return this.lift(new SampleOperator(notifier));
  }
  exports.sample = sample;
  var SampleOperator = (function () {
      function SampleOperator(notifier) {
          this.notifier = notifier;
      }
      SampleOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SampleSubscriber(subscriber, this.notifier));
      };
      return SampleOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SampleSubscriber = (function (_super) {
      __extends(SampleSubscriber, _super);
      function SampleSubscriber(destination, notifier) {
          _super.call(this, destination);
          this.hasValue = false;
          this.add(subscribeToResult_1.subscribeToResult(this, notifier));
      }
      SampleSubscriber.prototype._next = function (value) {
          this.value = value;
          this.hasValue = true;
      };
      SampleSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.emitValue();
      };
      SampleSubscriber.prototype.notifyComplete = function () {
          this.emitValue();
      };
      SampleSubscriber.prototype.emitValue = function () {
          if (this.hasValue) {
              this.hasValue = false;
              this.destination.next(this.value);
          }
      };
      return SampleSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=sample.js.map

/***/ },
/* 330 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var async_1 = __webpack_require__(10);
  /**
   * Emits the most recently emitted value from the source Observable within
   * periodic time intervals.
   *
   * <span class="informal">Samples the source Observable at periodic time
   * intervals, emitting what it samples.</span>
   *
   * <img src="./img/sampleTime.png" width="100%">
   *
   * `sampleTime` periodically looks at the source Observable and emits whichever
   * value it has most recently emitted since the previous sampling, unless the
   * source has not emitted anything since the previous sampling. The sampling
   * happens periodically in time every `period` milliseconds (or the time unit
   * defined by the optional `scheduler` argument). The sampling starts as soon as
   * the output Observable is subscribed.
   *
   * @example <caption>Every second, emit the most recent click at most once</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.sampleTime(1000);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link auditTime}
   * @see {@link debounceTime}
   * @see {@link delay}
   * @see {@link sample}
   * @see {@link throttleTime}
   *
   * @param {number} period The sampling period expressed in milliseconds or the
   * time unit determined internally by the optional `scheduler`.
   * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
   * managing the timers that handle the sampling.
   * @return {Observable<T>} An Observable that emits the results of sampling the
   * values emitted by the source Observable at the specified time interval.
   * @method sampleTime
   * @owner Observable
   */
  function sampleTime(period, scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new SampleTimeOperator(period, scheduler));
  }
  exports.sampleTime = sampleTime;
  var SampleTimeOperator = (function () {
      function SampleTimeOperator(period, scheduler) {
          this.period = period;
          this.scheduler = scheduler;
      }
      SampleTimeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SampleTimeSubscriber(subscriber, this.period, this.scheduler));
      };
      return SampleTimeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SampleTimeSubscriber = (function (_super) {
      __extends(SampleTimeSubscriber, _super);
      function SampleTimeSubscriber(destination, period, scheduler) {
          _super.call(this, destination);
          this.period = period;
          this.scheduler = scheduler;
          this.hasValue = false;
          this.add(scheduler.schedule(dispatchNotification, period, { subscriber: this, period: period }));
      }
      SampleTimeSubscriber.prototype._next = function (value) {
          this.lastValue = value;
          this.hasValue = true;
      };
      SampleTimeSubscriber.prototype.notifyNext = function () {
          if (this.hasValue) {
              this.hasValue = false;
              this.destination.next(this.lastValue);
          }
      };
      return SampleTimeSubscriber;
  }(Subscriber_1.Subscriber));
  function dispatchNotification(state) {
      var subscriber = state.subscriber, period = state.period;
      subscriber.notifyNext();
      this.schedule(state, period);
  }
  //# sourceMappingURL=sampleTime.js.map

/***/ },
/* 331 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /* tslint:disable:max-line-length */
  function scan(accumulator, seed) {
      return this.lift(new ScanOperator(accumulator, seed));
  }
  exports.scan = scan;
  var ScanOperator = (function () {
      function ScanOperator(accumulator, seed) {
          this.accumulator = accumulator;
          this.seed = seed;
      }
      ScanOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ScanSubscriber(subscriber, this.accumulator, this.seed));
      };
      return ScanOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ScanSubscriber = (function (_super) {
      __extends(ScanSubscriber, _super);
      function ScanSubscriber(destination, accumulator, seed) {
          _super.call(this, destination);
          this.accumulator = accumulator;
          this.index = 0;
          this.accumulatorSet = false;
          this.seed = seed;
          this.accumulatorSet = typeof seed !== 'undefined';
      }
      Object.defineProperty(ScanSubscriber.prototype, "seed", {
          get: function () {
              return this._seed;
          },
          set: function (value) {
              this.accumulatorSet = true;
              this._seed = value;
          },
          enumerable: true,
          configurable: true
      });
      ScanSubscriber.prototype._next = function (value) {
          if (!this.accumulatorSet) {
              this.seed = value;
              this.destination.next(value);
          }
          else {
              return this._tryNext(value);
          }
      };
      ScanSubscriber.prototype._tryNext = function (value) {
          var index = this.index++;
          var result;
          try {
              result = this.accumulator(this.seed, value, index);
          }
          catch (err) {
              this.destination.error(err);
          }
          this.seed = result;
          this.destination.next(result);
      };
      return ScanSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=scan.js.map

/***/ },
/* 332 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  /**
   * Compares all values of two observables in sequence using an optional comparor function
   * and returns an observable of a single boolean value representing whether or not the two sequences
   * are equal.
   *
   * <span class="informal">Checks to see of all values emitted by both observables are equal, in order.</span>
   *
   * <img src="./img/sequenceEqual.png" width="100%">
   *
   * `sequenceEqual` subscribes to two observables and buffers incoming values from each observable. Whenever either
   * observable emits a value, the value is buffered and the buffers are shifted and compared from the bottom
   * up; If any value pair doesn't match, the returned observable will emit `false` and complete. If one of the
   * observables completes, the operator will wait for the other observable to complete; If the other
   * observable emits before completing, the returned observable will emit `false` and complete. If one observable never
   * completes or emits after the other complets, the returned observable will never complete.
   *
   * @example <caption>figure out if the Konami code matches</caption>
   * var code = Observable.from([
   *  "ArrowUp",
   *  "ArrowUp",
   *  "ArrowDown",
   *  "ArrowDown",
   *  "ArrowLeft",
   *  "ArrowRight",
   *  "ArrowLeft",
   *  "ArrowRight",
   *  "KeyB",
   *  "KeyA",
   *  "Enter" // no start key, clearly.
   * ]);
   *
   * var keys = Rx.Observable.fromEvent(document, 'keyup')
   *  .map(e => e.code);
   * var matches = keys.bufferCount(11, 1)
   *  .mergeMap(
   *    last11 =>
   *      Rx.Observable.from(last11)
   *        .sequenceEqual(code)
   *   );
   * matches.subscribe(matched => console.log('Successful cheat at Contra? ', matched));
   *
   * @see {@link combineLatest}
   * @see {@link zip}
   * @see {@link withLatestFrom}
   *
   * @param {Observable} compareTo the observable sequence to compare the source sequence to.
   * @param {function} [comparor] An optional function to compare each value pair
   * @return {Observable} An Observable of a single boolean value representing whether or not
   * the values emitted by both observables were equal in sequence
   * @method sequenceEqual
   * @owner Observable
   */
  function sequenceEqual(compareTo, comparor) {
      return this.lift(new SequenceEqualOperator(compareTo, comparor));
  }
  exports.sequenceEqual = sequenceEqual;
  var SequenceEqualOperator = (function () {
      function SequenceEqualOperator(compareTo, comparor) {
          this.compareTo = compareTo;
          this.comparor = comparor;
      }
      SequenceEqualOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SequenceEqualSubscriber(subscriber, this.compareTo, this.comparor));
      };
      return SequenceEqualOperator;
  }());
  exports.SequenceEqualOperator = SequenceEqualOperator;
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SequenceEqualSubscriber = (function (_super) {
      __extends(SequenceEqualSubscriber, _super);
      function SequenceEqualSubscriber(destination, compareTo, comparor) {
          _super.call(this, destination);
          this.compareTo = compareTo;
          this.comparor = comparor;
          this._a = [];
          this._b = [];
          this._oneComplete = false;
          this.add(compareTo.subscribe(new SequenceEqualCompareToSubscriber(destination, this)));
      }
      SequenceEqualSubscriber.prototype._next = function (value) {
          if (this._oneComplete && this._b.length === 0) {
              this.emit(false);
          }
          else {
              this._a.push(value);
              this.checkValues();
          }
      };
      SequenceEqualSubscriber.prototype._complete = function () {
          if (this._oneComplete) {
              this.emit(this._a.length === 0 && this._b.length === 0);
          }
          else {
              this._oneComplete = true;
          }
      };
      SequenceEqualSubscriber.prototype.checkValues = function () {
          var _c = this, _a = _c._a, _b = _c._b, comparor = _c.comparor;
          while (_a.length > 0 && _b.length > 0) {
              var a = _a.shift();
              var b = _b.shift();
              var areEqual = false;
              if (comparor) {
                  areEqual = tryCatch_1.tryCatch(comparor)(a, b);
                  if (areEqual === errorObject_1.errorObject) {
                      this.destination.error(errorObject_1.errorObject.e);
                  }
              }
              else {
                  areEqual = a === b;
              }
              if (!areEqual) {
                  this.emit(false);
              }
          }
      };
      SequenceEqualSubscriber.prototype.emit = function (value) {
          var destination = this.destination;
          destination.next(value);
          destination.complete();
      };
      SequenceEqualSubscriber.prototype.nextB = function (value) {
          if (this._oneComplete && this._a.length === 0) {
              this.emit(false);
          }
          else {
              this._b.push(value);
              this.checkValues();
          }
      };
      return SequenceEqualSubscriber;
  }(Subscriber_1.Subscriber));
  exports.SequenceEqualSubscriber = SequenceEqualSubscriber;
  var SequenceEqualCompareToSubscriber = (function (_super) {
      __extends(SequenceEqualCompareToSubscriber, _super);
      function SequenceEqualCompareToSubscriber(destination, parent) {
          _super.call(this, destination);
          this.parent = parent;
      }
      SequenceEqualCompareToSubscriber.prototype._next = function (value) {
          this.parent.nextB(value);
      };
      SequenceEqualCompareToSubscriber.prototype._error = function (err) {
          this.parent.error(err);
      };
      SequenceEqualCompareToSubscriber.prototype._complete = function () {
          this.parent._complete();
      };
      return SequenceEqualCompareToSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=sequenceEqual.js.map

/***/ },
/* 333 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var multicast_1 = __webpack_require__(17);
  var Subject_1 = __webpack_require__(5);
  function shareSubjectFactory() {
      return new Subject_1.Subject();
  }
  /**
   * Returns a new Observable that multicasts (shares) the original Observable. As long as there is at least one
   * Subscriber this Observable will be subscribed and emitting data. When all subscribers have unsubscribed it will
   * unsubscribe from the source Observable. Because the Observable is multicasting it makes the stream `hot`.
   * This is an alias for .publish().refCount().
   *
   * <img src="./img/share.png" width="100%">
   *
   * @return {Observable<T>} an Observable that upon connection causes the source Observable to emit items to its Observers
   * @method share
   * @owner Observable
   */
  function share() {
      return multicast_1.multicast.call(this, shareSubjectFactory).refCount();
  }
  exports.share = share;
  ;
  //# sourceMappingURL=share.js.map

/***/ },
/* 334 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var EmptyError_1 = __webpack_require__(30);
  /**
   * Returns an Observable that emits the single item emitted by the source Observable that matches a specified
   * predicate, if that Observable emits one such item. If the source Observable emits more than one such item or no
   * such items, notify of an IllegalArgumentException or NoSuchElementException respectively.
   *
   * <img src="./img/single.png" width="100%">
   *
   * @throws {EmptyError} Delivers an EmptyError to the Observer's `error`
   * callback if the Observable completes before any `next` notification was sent.
   * @param {Function} a predicate function to evaluate items emitted by the source Observable.
   * @return {Observable<T>} an Observable that emits the single item emitted by the source Observable that matches
   * the predicate.
   .
   * @method single
   * @owner Observable
   */
  function single(predicate) {
      return this.lift(new SingleOperator(predicate, this));
  }
  exports.single = single;
  var SingleOperator = (function () {
      function SingleOperator(predicate, source) {
          this.predicate = predicate;
          this.source = source;
      }
      SingleOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SingleSubscriber(subscriber, this.predicate, this.source));
      };
      return SingleOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SingleSubscriber = (function (_super) {
      __extends(SingleSubscriber, _super);
      function SingleSubscriber(destination, predicate, source) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.source = source;
          this.seenValue = false;
          this.index = 0;
      }
      SingleSubscriber.prototype.applySingleValue = function (value) {
          if (this.seenValue) {
              this.destination.error('Sequence contains more than one element');
          }
          else {
              this.seenValue = true;
              this.singleValue = value;
          }
      };
      SingleSubscriber.prototype._next = function (value) {
          var predicate = this.predicate;
          this.index++;
          if (predicate) {
              this.tryNext(value);
          }
          else {
              this.applySingleValue(value);
          }
      };
      SingleSubscriber.prototype.tryNext = function (value) {
          try {
              var result = this.predicate(value, this.index, this.source);
              if (result) {
                  this.applySingleValue(value);
              }
          }
          catch (err) {
              this.destination.error(err);
          }
      };
      SingleSubscriber.prototype._complete = function () {
          var destination = this.destination;
          if (this.index > 0) {
              destination.next(this.seenValue ? this.singleValue : undefined);
              destination.complete();
          }
          else {
              destination.error(new EmptyError_1.EmptyError);
          }
      };
      return SingleSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=single.js.map

/***/ },
/* 335 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Returns an Observable that skips `n` items emitted by an Observable.
   *
   * <img src="./img/skip.png" width="100%">
   *
   * @param {Number} the `n` of times, items emitted by source Observable should be skipped.
   * @return {Observable} an Observable that skips values emitted by the source Observable.
   *
   * @method skip
   * @owner Observable
   */
  function skip(total) {
      return this.lift(new SkipOperator(total));
  }
  exports.skip = skip;
  var SkipOperator = (function () {
      function SkipOperator(total) {
          this.total = total;
      }
      SkipOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SkipSubscriber(subscriber, this.total));
      };
      return SkipOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SkipSubscriber = (function (_super) {
      __extends(SkipSubscriber, _super);
      function SkipSubscriber(destination, total) {
          _super.call(this, destination);
          this.total = total;
          this.count = 0;
      }
      SkipSubscriber.prototype._next = function (x) {
          if (++this.count > this.total) {
              this.destination.next(x);
          }
      };
      return SkipSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=skip.js.map

/***/ },
/* 336 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Returns an Observable that skips items emitted by the source Observable until a second Observable emits an item.
   *
   * <img src="./img/skipUntil.png" width="100%">
   *
   * @param {Observable} the second Observable that has to emit an item before the source Observable's elements begin to
   * be mirrored by the resulting Observable.
   * @return {Observable<T>} an Observable that skips items from the source Observable until the second Observable emits
   * an item, then emits the remaining items.
   * @method skipUntil
   * @owner Observable
   */
  function skipUntil(notifier) {
      return this.lift(new SkipUntilOperator(notifier));
  }
  exports.skipUntil = skipUntil;
  var SkipUntilOperator = (function () {
      function SkipUntilOperator(notifier) {
          this.notifier = notifier;
      }
      SkipUntilOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SkipUntilSubscriber(subscriber, this.notifier));
      };
      return SkipUntilOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SkipUntilSubscriber = (function (_super) {
      __extends(SkipUntilSubscriber, _super);
      function SkipUntilSubscriber(destination, notifier) {
          _super.call(this, destination);
          this.hasValue = false;
          this.isInnerStopped = false;
          this.add(subscribeToResult_1.subscribeToResult(this, notifier));
      }
      SkipUntilSubscriber.prototype._next = function (value) {
          if (this.hasValue) {
              _super.prototype._next.call(this, value);
          }
      };
      SkipUntilSubscriber.prototype._complete = function () {
          if (this.isInnerStopped) {
              _super.prototype._complete.call(this);
          }
          else {
              this.unsubscribe();
          }
      };
      SkipUntilSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.hasValue = true;
      };
      SkipUntilSubscriber.prototype.notifyComplete = function () {
          this.isInnerStopped = true;
          if (this.isStopped) {
              _super.prototype._complete.call(this);
          }
      };
      return SkipUntilSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=skipUntil.js.map

/***/ },
/* 337 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Returns an Observable that skips all items emitted by the source Observable as long as a specified condition holds
   * true, but emits all further source items as soon as the condition becomes false.
   *
   * <img src="./img/skipWhile.png" width="100%">
   *
   * @param {Function} predicate - a function to test each item emitted from the source Observable.
   * @return {Observable<T>} an Observable that begins emitting items emitted by the source Observable when the
   * specified predicate becomes false.
   * @method skipWhile
   * @owner Observable
   */
  function skipWhile(predicate) {
      return this.lift(new SkipWhileOperator(predicate));
  }
  exports.skipWhile = skipWhile;
  var SkipWhileOperator = (function () {
      function SkipWhileOperator(predicate) {
          this.predicate = predicate;
      }
      SkipWhileOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SkipWhileSubscriber(subscriber, this.predicate));
      };
      return SkipWhileOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SkipWhileSubscriber = (function (_super) {
      __extends(SkipWhileSubscriber, _super);
      function SkipWhileSubscriber(destination, predicate) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.skipping = true;
          this.index = 0;
      }
      SkipWhileSubscriber.prototype._next = function (value) {
          var destination = this.destination;
          if (this.skipping) {
              this.tryCallPredicate(value);
          }
          if (!this.skipping) {
              destination.next(value);
          }
      };
      SkipWhileSubscriber.prototype.tryCallPredicate = function (value) {
          try {
              var result = this.predicate(value, this.index++);
              this.skipping = Boolean(result);
          }
          catch (err) {
              this.destination.error(err);
          }
      };
      return SkipWhileSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=skipWhile.js.map

/***/ },
/* 338 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var ArrayObservable_1 = __webpack_require__(12);
  var ScalarObservable_1 = __webpack_require__(36);
  var EmptyObservable_1 = __webpack_require__(14);
  var concat_1 = __webpack_require__(38);
  var isScheduler_1 = __webpack_require__(15);
  /* tslint:disable:max-line-length */
  function startWith() {
      var array = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          array[_i - 0] = arguments[_i];
      }
      var scheduler = array[array.length - 1];
      if (isScheduler_1.isScheduler(scheduler)) {
          array.pop();
      }
      else {
          scheduler = null;
      }
      var len = array.length;
      if (len === 1) {
          return concat_1.concatStatic(new ScalarObservable_1.ScalarObservable(array[0], scheduler), this);
      }
      else if (len > 1) {
          return concat_1.concatStatic(new ArrayObservable_1.ArrayObservable(array, scheduler), this);
      }
      else {
          return concat_1.concatStatic(new EmptyObservable_1.EmptyObservable(scheduler), this);
      }
  }
  exports.startWith = startWith;
  //# sourceMappingURL=startWith.js.map

/***/ },
/* 339 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var SubscribeOnObservable_1 = __webpack_require__(250);
  /**
   * Asynchronously subscribes Observers to this Observable on the specified Scheduler.
   *
   * <img src="./img/subscribeOn.png" width="100%">
   *
   * @param {Scheduler} the Scheduler to perform subscription actions on.
   * @return {Observable<T>} the source Observable modified so that its subscriptions happen on the specified Scheduler
   .
   * @method subscribeOn
   * @owner Observable
   */
  function subscribeOn(scheduler, delay) {
      if (delay === void 0) { delay = 0; }
      return new SubscribeOnObservable_1.SubscribeOnObservable(this, delay, scheduler);
  }
  exports.subscribeOn = subscribeOn;
  //# sourceMappingURL=subscribeOn.js.map

/***/ },
/* 340 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Converts a higher-order Observable into a first-order Observable by
   * subscribing to only the most recently emitted of those inner Observables.
   *
   * <span class="informal">Flattens an Observable-of-Observables by dropping the
   * previous inner Observable once a new one appears.</span>
   *
   * <img src="./img/switch.png" width="100%">
   *
   * `switch` subscribes to an Observable that emits Observables, also known as a
   * higher-order Observable. Each time it observes one of these emitted inner
   * Observables, the output Observable subscribes to the inner Observable and
   * begins emitting the items emitted by that. So far, it behaves
   * like {@link mergeAll}. However, when a new inner Observable is emitted,
   * `switch` unsubscribes from the earlier-emitted inner Observable and
   * subscribes to the new inner Observable and begins emitting items from it. It
   * continues to behave like this for subsequent inner Observables.
   *
   * @example <caption>Rerun an interval Observable on every click event</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * // Each click event is mapped to an Observable that ticks every second
   * var higherOrder = clicks.map((ev) => Rx.Observable.interval(1000));
   * var switched = higherOrder.switch();
   * // The outcome is that `switched` is essentially a timer that restarts
   * // on every click. The interval Observables from older clicks do not merge
   * // with the current interval Observable.
   * switched.subscribe(x => console.log(x));
   *
   * @see {@link combineAll}
   * @see {@link concatAll}
   * @see {@link exhaust}
   * @see {@link mergeAll}
   * @see {@link switchMap}
   * @see {@link switchMapTo}
   * @see {@link zipAll}
   *
   * @return {Observable<T>} An Observable that emits the items emitted by the
   * Observable most recently emitted by the source Observable.
   * @method switch
   * @name switch
   * @owner Observable
   */
  function _switch() {
      return this.lift(new SwitchOperator());
  }
  exports._switch = _switch;
  var SwitchOperator = (function () {
      function SwitchOperator() {
      }
      SwitchOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SwitchSubscriber(subscriber));
      };
      return SwitchOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SwitchSubscriber = (function (_super) {
      __extends(SwitchSubscriber, _super);
      function SwitchSubscriber(destination) {
          _super.call(this, destination);
          this.active = 0;
          this.hasCompleted = false;
      }
      SwitchSubscriber.prototype._next = function (value) {
          this.unsubscribeInner();
          this.active++;
          this.add(this.innerSubscription = subscribeToResult_1.subscribeToResult(this, value));
      };
      SwitchSubscriber.prototype._complete = function () {
          this.hasCompleted = true;
          if (this.active === 0) {
              this.destination.complete();
          }
      };
      SwitchSubscriber.prototype.unsubscribeInner = function () {
          this.active = this.active > 0 ? this.active - 1 : 0;
          var innerSubscription = this.innerSubscription;
          if (innerSubscription) {
              innerSubscription.unsubscribe();
              this.remove(innerSubscription);
          }
      };
      SwitchSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.destination.next(innerValue);
      };
      SwitchSubscriber.prototype.notifyError = function (err) {
          this.destination.error(err);
      };
      SwitchSubscriber.prototype.notifyComplete = function () {
          this.unsubscribeInner();
          if (this.hasCompleted && this.active === 0) {
              this.destination.complete();
          }
      };
      return SwitchSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=switch.js.map

/***/ },
/* 341 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function switchMap(project, resultSelector) {
      return this.lift(new SwitchMapOperator(project, resultSelector));
  }
  exports.switchMap = switchMap;
  var SwitchMapOperator = (function () {
      function SwitchMapOperator(project, resultSelector) {
          this.project = project;
          this.resultSelector = resultSelector;
      }
      SwitchMapOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SwitchMapSubscriber(subscriber, this.project, this.resultSelector));
      };
      return SwitchMapOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SwitchMapSubscriber = (function (_super) {
      __extends(SwitchMapSubscriber, _super);
      function SwitchMapSubscriber(destination, project, resultSelector) {
          _super.call(this, destination);
          this.project = project;
          this.resultSelector = resultSelector;
          this.index = 0;
      }
      SwitchMapSubscriber.prototype._next = function (value) {
          var result;
          var index = this.index++;
          try {
              result = this.project(value, index);
          }
          catch (error) {
              this.destination.error(error);
              return;
          }
          this._innerSub(result, value, index);
      };
      SwitchMapSubscriber.prototype._innerSub = function (result, value, index) {
          var innerSubscription = this.innerSubscription;
          if (innerSubscription) {
              innerSubscription.unsubscribe();
          }
          this.add(this.innerSubscription = subscribeToResult_1.subscribeToResult(this, result, value, index));
      };
      SwitchMapSubscriber.prototype._complete = function () {
          var innerSubscription = this.innerSubscription;
          if (!innerSubscription || innerSubscription.closed) {
              _super.prototype._complete.call(this);
          }
      };
      SwitchMapSubscriber.prototype._unsubscribe = function () {
          this.innerSubscription = null;
      };
      SwitchMapSubscriber.prototype.notifyComplete = function (innerSub) {
          this.remove(innerSub);
          this.innerSubscription = null;
          if (this.isStopped) {
              _super.prototype._complete.call(this);
          }
      };
      SwitchMapSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          if (this.resultSelector) {
              this._tryNotifyNext(outerValue, innerValue, outerIndex, innerIndex);
          }
          else {
              this.destination.next(innerValue);
          }
      };
      SwitchMapSubscriber.prototype._tryNotifyNext = function (outerValue, innerValue, outerIndex, innerIndex) {
          var result;
          try {
              result = this.resultSelector(outerValue, innerValue, outerIndex, innerIndex);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.destination.next(result);
      };
      return SwitchMapSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=switchMap.js.map

/***/ },
/* 342 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function switchMapTo(innerObservable, resultSelector) {
      return this.lift(new SwitchMapToOperator(innerObservable, resultSelector));
  }
  exports.switchMapTo = switchMapTo;
  var SwitchMapToOperator = (function () {
      function SwitchMapToOperator(observable, resultSelector) {
          this.observable = observable;
          this.resultSelector = resultSelector;
      }
      SwitchMapToOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new SwitchMapToSubscriber(subscriber, this.observable, this.resultSelector));
      };
      return SwitchMapToOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var SwitchMapToSubscriber = (function (_super) {
      __extends(SwitchMapToSubscriber, _super);
      function SwitchMapToSubscriber(destination, inner, resultSelector) {
          _super.call(this, destination);
          this.inner = inner;
          this.resultSelector = resultSelector;
          this.index = 0;
      }
      SwitchMapToSubscriber.prototype._next = function (value) {
          var innerSubscription = this.innerSubscription;
          if (innerSubscription) {
              innerSubscription.unsubscribe();
          }
          this.add(this.innerSubscription = subscribeToResult_1.subscribeToResult(this, this.inner, value, this.index++));
      };
      SwitchMapToSubscriber.prototype._complete = function () {
          var innerSubscription = this.innerSubscription;
          if (!innerSubscription || innerSubscription.closed) {
              _super.prototype._complete.call(this);
          }
      };
      SwitchMapToSubscriber.prototype._unsubscribe = function () {
          this.innerSubscription = null;
      };
      SwitchMapToSubscriber.prototype.notifyComplete = function (innerSub) {
          this.remove(innerSub);
          this.innerSubscription = null;
          if (this.isStopped) {
              _super.prototype._complete.call(this);
          }
      };
      SwitchMapToSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          var _a = this, resultSelector = _a.resultSelector, destination = _a.destination;
          if (resultSelector) {
              this.tryResultSelector(outerValue, innerValue, outerIndex, innerIndex);
          }
          else {
              destination.next(innerValue);
          }
      };
      SwitchMapToSubscriber.prototype.tryResultSelector = function (outerValue, innerValue, outerIndex, innerIndex) {
          var _a = this, resultSelector = _a.resultSelector, destination = _a.destination;
          var result;
          try {
              result = resultSelector(outerValue, innerValue, outerIndex, innerIndex);
          }
          catch (err) {
              destination.error(err);
              return;
          }
          destination.next(result);
      };
      return SwitchMapToSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=switchMapTo.js.map

/***/ },
/* 343 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var ArgumentOutOfRangeError_1 = __webpack_require__(29);
  var EmptyObservable_1 = __webpack_require__(14);
  /**
   * Emits only the first `count` values emitted by the source Observable.
   *
   * <span class="informal">Takes the first `count` values from the source, then
   * completes.</span>
   *
   * <img src="./img/take.png" width="100%">
   *
   * `take` returns an Observable that emits only the first `count` values emitted
   * by the source Observable. If the source emits fewer than `count` values then
   * all of its values are emitted. After that, it completes, regardless if the
   * source completes.
   *
   * @example <caption>Take the first 5 seconds of an infinite 1-second interval Observable</caption>
   * var interval = Rx.Observable.interval(1000);
   * var five = interval.take(5);
   * five.subscribe(x => console.log(x));
   *
   * @see {@link takeLast}
   * @see {@link takeUntil}
   * @see {@link takeWhile}
   * @see {@link skip}
   *
   * @throws {ArgumentOutOfRangeError} When using `take(i)`, it delivers an
   * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0`.
   *
   * @param {number} count The maximum number of `next` values to emit.
   * @return {Observable<T>} An Observable that emits only the first `count`
   * values emitted by the source Observable, or all of the values from the source
   * if the source emits fewer than `count` values.
   * @method take
   * @owner Observable
   */
  function take(count) {
      if (count === 0) {
          return new EmptyObservable_1.EmptyObservable();
      }
      else {
          return this.lift(new TakeOperator(count));
      }
  }
  exports.take = take;
  var TakeOperator = (function () {
      function TakeOperator(total) {
          this.total = total;
          if (this.total < 0) {
              throw new ArgumentOutOfRangeError_1.ArgumentOutOfRangeError;
          }
      }
      TakeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new TakeSubscriber(subscriber, this.total));
      };
      return TakeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TakeSubscriber = (function (_super) {
      __extends(TakeSubscriber, _super);
      function TakeSubscriber(destination, total) {
          _super.call(this, destination);
          this.total = total;
          this.count = 0;
      }
      TakeSubscriber.prototype._next = function (value) {
          var total = this.total;
          var count = ++this.count;
          if (count <= total) {
              this.destination.next(value);
              if (count === total) {
                  this.destination.complete();
                  this.unsubscribe();
              }
          }
      };
      return TakeSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=take.js.map

/***/ },
/* 344 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var ArgumentOutOfRangeError_1 = __webpack_require__(29);
  var EmptyObservable_1 = __webpack_require__(14);
  /**
   * Emits only the last `count` values emitted by the source Observable.
   *
   * <span class="informal">Remembers the latest `count` values, then emits those
   * only when the source completes.</span>
   *
   * <img src="./img/takeLast.png" width="100%">
   *
   * `takeLast` returns an Observable that emits at most the last `count` values
   * emitted by the source Observable. If the source emits fewer than `count`
   * values then all of its values are emitted. This operator must wait until the
   * `complete` notification emission from the source in order to emit the `next`
   * values on the output Observable, because otherwise it is impossible to know
   * whether or not more values will be emitted on the source. For this reason,
   * all values are emitted synchronously, followed by the complete notification.
   *
   * @example <caption>Take the last 3 values of an Observable with many values</caption>
   * var many = Rx.Observable.range(1, 100);
   * var lastThree = many.takeLast(3);
   * lastThree.subscribe(x => console.log(x));
   *
   * @see {@link take}
   * @see {@link takeUntil}
   * @see {@link takeWhile}
   * @see {@link skip}
   *
   * @throws {ArgumentOutOfRangeError} When using `takeLast(i)`, it delivers an
   * ArgumentOutOrRangeError to the Observer's `error` callback if `i < 0`.
   *
   * @param {number} count The maximum number of values to emit from the end of
   * the sequence of values emitted by the source Observable.
   * @return {Observable<T>} An Observable that emits at most the last count
   * values emitted by the source Observable.
   * @method takeLast
   * @owner Observable
   */
  function takeLast(count) {
      if (count === 0) {
          return new EmptyObservable_1.EmptyObservable();
      }
      else {
          return this.lift(new TakeLastOperator(count));
      }
  }
  exports.takeLast = takeLast;
  var TakeLastOperator = (function () {
      function TakeLastOperator(total) {
          this.total = total;
          if (this.total < 0) {
              throw new ArgumentOutOfRangeError_1.ArgumentOutOfRangeError;
          }
      }
      TakeLastOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new TakeLastSubscriber(subscriber, this.total));
      };
      return TakeLastOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TakeLastSubscriber = (function (_super) {
      __extends(TakeLastSubscriber, _super);
      function TakeLastSubscriber(destination, total) {
          _super.call(this, destination);
          this.total = total;
          this.ring = new Array();
          this.count = 0;
      }
      TakeLastSubscriber.prototype._next = function (value) {
          var ring = this.ring;
          var total = this.total;
          var count = this.count++;
          if (ring.length < total) {
              ring.push(value);
          }
          else {
              var index = count % total;
              ring[index] = value;
          }
      };
      TakeLastSubscriber.prototype._complete = function () {
          var destination = this.destination;
          var count = this.count;
          if (count > 0) {
              var total = this.count >= this.total ? this.total : this.count;
              var ring = this.ring;
              for (var i = 0; i < total; i++) {
                  var idx = (count++) % total;
                  destination.next(ring[idx]);
              }
          }
          destination.complete();
      };
      return TakeLastSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=takeLast.js.map

/***/ },
/* 345 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Emits the values emitted by the source Observable until a `notifier`
   * Observable emits a value.
   *
   * <span class="informal">Lets values pass until a second Observable,
   * `notifier`, emits something. Then, it completes.</span>
   *
   * <img src="./img/takeUntil.png" width="100%">
   *
   * `takeUntil` subscribes and begins mirroring the source Observable. It also
   * monitors a second Observable, `notifier` that you provide. If the `notifier`
   * emits a value or a complete notification, the output Observable stops
   * mirroring the source Observable and completes.
   *
   * @example <caption>Tick every second until the first click happens</caption>
   * var interval = Rx.Observable.interval(1000);
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = interval.takeUntil(clicks);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link take}
   * @see {@link takeLast}
   * @see {@link takeWhile}
   * @see {@link skip}
   *
   * @param {Observable} notifier The Observable whose first emitted value will
   * cause the output Observable of `takeUntil` to stop emitting values from the
   * source Observable.
   * @return {Observable<T>} An Observable that emits the values from the source
   * Observable until such time as `notifier` emits its first value.
   * @method takeUntil
   * @owner Observable
   */
  function takeUntil(notifier) {
      return this.lift(new TakeUntilOperator(notifier));
  }
  exports.takeUntil = takeUntil;
  var TakeUntilOperator = (function () {
      function TakeUntilOperator(notifier) {
          this.notifier = notifier;
      }
      TakeUntilOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new TakeUntilSubscriber(subscriber, this.notifier));
      };
      return TakeUntilOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TakeUntilSubscriber = (function (_super) {
      __extends(TakeUntilSubscriber, _super);
      function TakeUntilSubscriber(destination, notifier) {
          _super.call(this, destination);
          this.notifier = notifier;
          this.add(subscribeToResult_1.subscribeToResult(this, notifier));
      }
      TakeUntilSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.complete();
      };
      TakeUntilSubscriber.prototype.notifyComplete = function () {
          // noop
      };
      return TakeUntilSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=takeUntil.js.map

/***/ },
/* 346 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Emits values emitted by the source Observable so long as each value satisfies
   * the given `predicate`, and then completes as soon as this `predicate` is not
   * satisfied.
   *
   * <span class="informal">Takes values from the source only while they pass the
   * condition given. When the first value does not satisfy, it completes.</span>
   *
   * <img src="./img/takeWhile.png" width="100%">
   *
   * `takeWhile` subscribes and begins mirroring the source Observable. Each value
   * emitted on the source is given to the `predicate` function which returns a
   * boolean, representing a condition to be satisfied by the source values. The
   * output Observable emits the source values until such time as the `predicate`
   * returns false, at which point `takeWhile` stops mirroring the source
   * Observable and completes the output Observable.
   *
   * @example <caption>Emit click events only while the clientX property is greater than 200</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.takeWhile(ev => ev.clientX > 200);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link take}
   * @see {@link takeLast}
   * @see {@link takeUntil}
   * @see {@link skip}
   *
   * @param {function(value: T, index: number): boolean} predicate A function that
   * evaluates a value emitted by the source Observable and returns a boolean.
   * Also takes the (zero-based) index as the second argument.
   * @return {Observable<T>} An Observable that emits the values from the source
   * Observable so long as each value satisfies the condition defined by the
   * `predicate`, then completes.
   * @method takeWhile
   * @owner Observable
   */
  function takeWhile(predicate) {
      return this.lift(new TakeWhileOperator(predicate));
  }
  exports.takeWhile = takeWhile;
  var TakeWhileOperator = (function () {
      function TakeWhileOperator(predicate) {
          this.predicate = predicate;
      }
      TakeWhileOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new TakeWhileSubscriber(subscriber, this.predicate));
      };
      return TakeWhileOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TakeWhileSubscriber = (function (_super) {
      __extends(TakeWhileSubscriber, _super);
      function TakeWhileSubscriber(destination, predicate) {
          _super.call(this, destination);
          this.predicate = predicate;
          this.index = 0;
      }
      TakeWhileSubscriber.prototype._next = function (value) {
          var destination = this.destination;
          var result;
          try {
              result = this.predicate(value, this.index++);
          }
          catch (err) {
              destination.error(err);
              return;
          }
          this.nextOrComplete(value, result);
      };
      TakeWhileSubscriber.prototype.nextOrComplete = function (value, predicateResult) {
          var destination = this.destination;
          if (Boolean(predicateResult)) {
              destination.next(value);
          }
          else {
              destination.complete();
          }
      };
      return TakeWhileSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=takeWhile.js.map

/***/ },
/* 347 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Emits a value from the source Observable, then ignores subsequent source
   * values for a duration determined by another Observable, then repeats this
   * process.
   *
   * <span class="informal">It's like {@link throttleTime}, but the silencing
   * duration is determined by a second Observable.</span>
   *
   * <img src="./img/throttle.png" width="100%">
   *
   * `throttle` emits the source Observable values on the output Observable
   * when its internal timer is disabled, and ignores source values when the timer
   * is enabled. Initially, the timer is disabled. As soon as the first source
   * value arrives, it is forwarded to the output Observable, and then the timer
   * is enabled by calling the `durationSelector` function with the source value,
   * which returns the "duration" Observable. When the duration Observable emits a
   * value or completes, the timer is disabled, and this process repeats for the
   * next source value.
   *
   * @example <caption>Emit clicks at a rate of at most one click per second</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.throttle(ev => Rx.Observable.interval(1000));
   * result.subscribe(x => console.log(x));
   *
   * @see {@link audit}
   * @see {@link debounce}
   * @see {@link delayWhen}
   * @see {@link sample}
   * @see {@link throttleTime}
   *
   * @param {function(value: T): Observable|Promise} durationSelector A function
   * that receives a value from the source Observable, for computing the silencing
   * duration for each source value, returned as an Observable or a Promise.
   * @return {Observable<T>} An Observable that performs the throttle operation to
   * limit the rate of emissions from the source.
   * @method throttle
   * @owner Observable
   */
  function throttle(durationSelector) {
      return this.lift(new ThrottleOperator(durationSelector));
  }
  exports.throttle = throttle;
  var ThrottleOperator = (function () {
      function ThrottleOperator(durationSelector) {
          this.durationSelector = durationSelector;
      }
      ThrottleOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ThrottleSubscriber(subscriber, this.durationSelector));
      };
      return ThrottleOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ThrottleSubscriber = (function (_super) {
      __extends(ThrottleSubscriber, _super);
      function ThrottleSubscriber(destination, durationSelector) {
          _super.call(this, destination);
          this.destination = destination;
          this.durationSelector = durationSelector;
      }
      ThrottleSubscriber.prototype._next = function (value) {
          if (!this.throttled) {
              this.tryDurationSelector(value);
          }
      };
      ThrottleSubscriber.prototype.tryDurationSelector = function (value) {
          var duration = null;
          try {
              duration = this.durationSelector(value);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.emitAndThrottle(value, duration);
      };
      ThrottleSubscriber.prototype.emitAndThrottle = function (value, duration) {
          this.add(this.throttled = subscribeToResult_1.subscribeToResult(this, duration));
          this.destination.next(value);
      };
      ThrottleSubscriber.prototype._unsubscribe = function () {
          var throttled = this.throttled;
          if (throttled) {
              this.remove(throttled);
              this.throttled = null;
              throttled.unsubscribe();
          }
      };
      ThrottleSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this._unsubscribe();
      };
      ThrottleSubscriber.prototype.notifyComplete = function () {
          this._unsubscribe();
      };
      return ThrottleSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=throttle.js.map

/***/ },
/* 348 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var async_1 = __webpack_require__(10);
  /**
   * Emits a value from the source Observable, then ignores subsequent source
   * values for `duration` milliseconds, then repeats this process.
   *
   * <span class="informal">Lets a value pass, then ignores source values for the
   * next `duration` milliseconds.</span>
   *
   * <img src="./img/throttleTime.png" width="100%">
   *
   * `throttleTime` emits the source Observable values on the output Observable
   * when its internal timer is disabled, and ignores source values when the timer
   * is enabled. Initially, the timer is disabled. As soon as the first source
   * value arrives, it is forwarded to the output Observable, and then the timer
   * is enabled. After `duration` milliseconds (or the time unit determined
   * internally by the optional `scheduler`) has passed, the timer is disabled,
   * and this process repeats for the next source value. Optionally takes a
   * {@link Scheduler} for managing timers.
   *
   * @example <caption>Emit clicks at a rate of at most one click per second</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.throttleTime(1000);
   * result.subscribe(x => console.log(x));
   *
   * @see {@link auditTime}
   * @see {@link debounceTime}
   * @see {@link delay}
   * @see {@link sampleTime}
   * @see {@link throttle}
   *
   * @param {number} duration Time to wait before emitting another value after
   * emitting the last value, measured in milliseconds or the time unit determined
   * internally by the optional `scheduler`.
   * @param {Scheduler} [scheduler=async] The {@link Scheduler} to use for
   * managing the timers that handle the sampling.
   * @return {Observable<T>} An Observable that performs the throttle operation to
   * limit the rate of emissions from the source.
   * @method throttleTime
   * @owner Observable
   */
  function throttleTime(duration, scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new ThrottleTimeOperator(duration, scheduler));
  }
  exports.throttleTime = throttleTime;
  var ThrottleTimeOperator = (function () {
      function ThrottleTimeOperator(duration, scheduler) {
          this.duration = duration;
          this.scheduler = scheduler;
      }
      ThrottleTimeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ThrottleTimeSubscriber(subscriber, this.duration, this.scheduler));
      };
      return ThrottleTimeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ThrottleTimeSubscriber = (function (_super) {
      __extends(ThrottleTimeSubscriber, _super);
      function ThrottleTimeSubscriber(destination, duration, scheduler) {
          _super.call(this, destination);
          this.duration = duration;
          this.scheduler = scheduler;
      }
      ThrottleTimeSubscriber.prototype._next = function (value) {
          if (!this.throttled) {
              this.add(this.throttled = this.scheduler.schedule(dispatchNext, this.duration, { subscriber: this }));
              this.destination.next(value);
          }
      };
      ThrottleTimeSubscriber.prototype.clearThrottle = function () {
          var throttled = this.throttled;
          if (throttled) {
              throttled.unsubscribe();
              this.remove(throttled);
              this.throttled = null;
          }
      };
      return ThrottleTimeSubscriber;
  }(Subscriber_1.Subscriber));
  function dispatchNext(arg) {
      var subscriber = arg.subscriber;
      subscriber.clearThrottle();
  }
  //# sourceMappingURL=throttleTime.js.map

/***/ },
/* 349 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var async_1 = __webpack_require__(10);
  var isDate_1 = __webpack_require__(31);
  var Subscriber_1 = __webpack_require__(2);
  var TimeoutError_1 = __webpack_require__(74);
  /**
   * @param due
   * @param errorToSend
   * @param scheduler
   * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
   * @method timeout
   * @owner Observable
   */
  function timeout(due, errorToSend, scheduler) {
      if (errorToSend === void 0) { errorToSend = null; }
      if (scheduler === void 0) { scheduler = async_1.async; }
      var absoluteTimeout = isDate_1.isDate(due);
      var waitFor = absoluteTimeout ? (+due - scheduler.now()) : Math.abs(due);
      return this.lift(new TimeoutOperator(waitFor, absoluteTimeout, errorToSend, scheduler));
  }
  exports.timeout = timeout;
  var TimeoutOperator = (function () {
      function TimeoutOperator(waitFor, absoluteTimeout, errorToSend, scheduler) {
          this.waitFor = waitFor;
          this.absoluteTimeout = absoluteTimeout;
          this.errorToSend = errorToSend;
          this.scheduler = scheduler;
      }
      TimeoutOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new TimeoutSubscriber(subscriber, this.absoluteTimeout, this.waitFor, this.errorToSend, this.scheduler));
      };
      return TimeoutOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TimeoutSubscriber = (function (_super) {
      __extends(TimeoutSubscriber, _super);
      function TimeoutSubscriber(destination, absoluteTimeout, waitFor, errorToSend, scheduler) {
          _super.call(this, destination);
          this.absoluteTimeout = absoluteTimeout;
          this.waitFor = waitFor;
          this.errorToSend = errorToSend;
          this.scheduler = scheduler;
          this.index = 0;
          this._previousIndex = 0;
          this._hasCompleted = false;
          this.scheduleTimeout();
      }
      Object.defineProperty(TimeoutSubscriber.prototype, "previousIndex", {
          get: function () {
              return this._previousIndex;
          },
          enumerable: true,
          configurable: true
      });
      Object.defineProperty(TimeoutSubscriber.prototype, "hasCompleted", {
          get: function () {
              return this._hasCompleted;
          },
          enumerable: true,
          configurable: true
      });
      TimeoutSubscriber.dispatchTimeout = function (state) {
          var source = state.subscriber;
          var currentIndex = state.index;
          if (!source.hasCompleted && source.previousIndex === currentIndex) {
              source.notifyTimeout();
          }
      };
      TimeoutSubscriber.prototype.scheduleTimeout = function () {
          var currentIndex = this.index;
          this.scheduler.schedule(TimeoutSubscriber.dispatchTimeout, this.waitFor, { subscriber: this, index: currentIndex });
          this.index++;
          this._previousIndex = currentIndex;
      };
      TimeoutSubscriber.prototype._next = function (value) {
          this.destination.next(value);
          if (!this.absoluteTimeout) {
              this.scheduleTimeout();
          }
      };
      TimeoutSubscriber.prototype._error = function (err) {
          this.destination.error(err);
          this._hasCompleted = true;
      };
      TimeoutSubscriber.prototype._complete = function () {
          this.destination.complete();
          this._hasCompleted = true;
      };
      TimeoutSubscriber.prototype.notifyTimeout = function () {
          this.error(this.errorToSend || new TimeoutError_1.TimeoutError());
      };
      return TimeoutSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=timeout.js.map

/***/ },
/* 350 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var async_1 = __webpack_require__(10);
  var isDate_1 = __webpack_require__(31);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function timeoutWith(due, withObservable, scheduler) {
      if (scheduler === void 0) { scheduler = async_1.async; }
      var absoluteTimeout = isDate_1.isDate(due);
      var waitFor = absoluteTimeout ? (+due - scheduler.now()) : Math.abs(due);
      return this.lift(new TimeoutWithOperator(waitFor, absoluteTimeout, withObservable, scheduler));
  }
  exports.timeoutWith = timeoutWith;
  var TimeoutWithOperator = (function () {
      function TimeoutWithOperator(waitFor, absoluteTimeout, withObservable, scheduler) {
          this.waitFor = waitFor;
          this.absoluteTimeout = absoluteTimeout;
          this.withObservable = withObservable;
          this.scheduler = scheduler;
      }
      TimeoutWithOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new TimeoutWithSubscriber(subscriber, this.absoluteTimeout, this.waitFor, this.withObservable, this.scheduler));
      };
      return TimeoutWithOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var TimeoutWithSubscriber = (function (_super) {
      __extends(TimeoutWithSubscriber, _super);
      function TimeoutWithSubscriber(destination, absoluteTimeout, waitFor, withObservable, scheduler) {
          _super.call(this);
          this.destination = destination;
          this.absoluteTimeout = absoluteTimeout;
          this.waitFor = waitFor;
          this.withObservable = withObservable;
          this.scheduler = scheduler;
          this.timeoutSubscription = undefined;
          this.index = 0;
          this._previousIndex = 0;
          this._hasCompleted = false;
          destination.add(this);
          this.scheduleTimeout();
      }
      Object.defineProperty(TimeoutWithSubscriber.prototype, "previousIndex", {
          get: function () {
              return this._previousIndex;
          },
          enumerable: true,
          configurable: true
      });
      Object.defineProperty(TimeoutWithSubscriber.prototype, "hasCompleted", {
          get: function () {
              return this._hasCompleted;
          },
          enumerable: true,
          configurable: true
      });
      TimeoutWithSubscriber.dispatchTimeout = function (state) {
          var source = state.subscriber;
          var currentIndex = state.index;
          if (!source.hasCompleted && source.previousIndex === currentIndex) {
              source.handleTimeout();
          }
      };
      TimeoutWithSubscriber.prototype.scheduleTimeout = function () {
          var currentIndex = this.index;
          var timeoutState = { subscriber: this, index: currentIndex };
          this.scheduler.schedule(TimeoutWithSubscriber.dispatchTimeout, this.waitFor, timeoutState);
          this.index++;
          this._previousIndex = currentIndex;
      };
      TimeoutWithSubscriber.prototype._next = function (value) {
          this.destination.next(value);
          if (!this.absoluteTimeout) {
              this.scheduleTimeout();
          }
      };
      TimeoutWithSubscriber.prototype._error = function (err) {
          this.destination.error(err);
          this._hasCompleted = true;
      };
      TimeoutWithSubscriber.prototype._complete = function () {
          this.destination.complete();
          this._hasCompleted = true;
      };
      TimeoutWithSubscriber.prototype.handleTimeout = function () {
          if (!this.closed) {
              var withObservable = this.withObservable;
              this.unsubscribe();
              this.destination.add(this.timeoutSubscription = subscribeToResult_1.subscribeToResult(this, withObservable));
          }
      };
      return TimeoutWithSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=timeoutWith.js.map

/***/ },
/* 351 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  /**
   * @return {Observable<any[]>|WebSocketSubject<T>|Observable<T>}
   * @method toArray
   * @owner Observable
   */
  function toArray() {
      return this.lift(new ToArrayOperator());
  }
  exports.toArray = toArray;
  var ToArrayOperator = (function () {
      function ToArrayOperator() {
      }
      ToArrayOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new ToArraySubscriber(subscriber));
      };
      return ToArrayOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ToArraySubscriber = (function (_super) {
      __extends(ToArraySubscriber, _super);
      function ToArraySubscriber(destination) {
          _super.call(this, destination);
          this.array = [];
      }
      ToArraySubscriber.prototype._next = function (x) {
          this.array.push(x);
      };
      ToArraySubscriber.prototype._complete = function () {
          this.destination.next(this.array);
          this.destination.complete();
      };
      return ToArraySubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=toArray.js.map

/***/ },
/* 352 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  /* tslint:disable:max-line-length */
  function toPromise(PromiseCtor) {
      var _this = this;
      if (!PromiseCtor) {
          if (root_1.root.Rx && root_1.root.Rx.config && root_1.root.Rx.config.Promise) {
              PromiseCtor = root_1.root.Rx.config.Promise;
          }
          else if (root_1.root.Promise) {
              PromiseCtor = root_1.root.Promise;
          }
      }
      if (!PromiseCtor) {
          throw new Error('no Promise impl found');
      }
      return new PromiseCtor(function (resolve, reject) {
          var value;
          _this.subscribe(function (x) { return value = x; }, function (err) { return reject(err); }, function () { return resolve(value); });
      });
  }
  exports.toPromise = toPromise;
  //# sourceMappingURL=toPromise.js.map

/***/ },
/* 353 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Branch out the source Observable values as a nested Observable whenever
   * `windowBoundaries` emits.
   *
   * <span class="informal">It's like {@link buffer}, but emits a nested Observable
   * instead of an array.</span>
   *
   * <img src="./img/window.png" width="100%">
   *
   * Returns an Observable that emits windows of items it collects from the source
   * Observable. The output Observable emits connected, non-overlapping
   * windows. It emits the current window and opens a new one whenever the
   * Observable `windowBoundaries` emits an item. Because each window is an
   * Observable, the output is a higher-order Observable.
   *
   * @example <caption>In every window of 1 second each, emit at most 2 click events</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var interval = Rx.Observable.interval(1000);
   * var result = clicks.window(interval)
   *   .map(win => win.take(2)) // each window has at most 2 emissions
   *   .mergeAll(); // flatten the Observable-of-Observables
   * result.subscribe(x => console.log(x));
   *
   * @see {@link windowCount}
   * @see {@link windowTime}
   * @see {@link windowToggle}
   * @see {@link windowWhen}
   * @see {@link buffer}
   *
   * @param {Observable<any>} windowBoundaries An Observable that completes the
   * previous window and starts a new window.
   * @return {Observable<Observable<T>>} An Observable of windows, which are
   * Observables emitting values of the source Observable.
   * @method window
   * @owner Observable
   */
  function window(windowBoundaries) {
      return this.lift(new WindowOperator(windowBoundaries));
  }
  exports.window = window;
  var WindowOperator = (function () {
      function WindowOperator(windowBoundaries) {
          this.windowBoundaries = windowBoundaries;
      }
      WindowOperator.prototype.call = function (subscriber, source) {
          var windowSubscriber = new WindowSubscriber(subscriber);
          var sourceSubscription = source._subscribe(windowSubscriber);
          if (!sourceSubscription.closed) {
              windowSubscriber.add(subscribeToResult_1.subscribeToResult(windowSubscriber, this.windowBoundaries));
          }
          return sourceSubscription;
      };
      return WindowOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var WindowSubscriber = (function (_super) {
      __extends(WindowSubscriber, _super);
      function WindowSubscriber(destination) {
          _super.call(this, destination);
          this.window = new Subject_1.Subject();
          destination.next(this.window);
      }
      WindowSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.openWindow();
      };
      WindowSubscriber.prototype.notifyError = function (error, innerSub) {
          this._error(error);
      };
      WindowSubscriber.prototype.notifyComplete = function (innerSub) {
          this._complete();
      };
      WindowSubscriber.prototype._next = function (value) {
          this.window.next(value);
      };
      WindowSubscriber.prototype._error = function (err) {
          this.window.error(err);
          this.destination.error(err);
      };
      WindowSubscriber.prototype._complete = function () {
          this.window.complete();
          this.destination.complete();
      };
      WindowSubscriber.prototype._unsubscribe = function () {
          this.window = null;
      };
      WindowSubscriber.prototype.openWindow = function () {
          var prevWindow = this.window;
          if (prevWindow) {
              prevWindow.complete();
          }
          var destination = this.destination;
          var newWindow = this.window = new Subject_1.Subject();
          destination.next(newWindow);
      };
      return WindowSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=window.js.map

/***/ },
/* 354 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscriber_1 = __webpack_require__(2);
  var Subject_1 = __webpack_require__(5);
  /**
   * Branch out the source Observable values as a nested Observable with each
   * nested Observable emitting at most `windowSize` values.
   *
   * <span class="informal">It's like {@link bufferCount}, but emits a nested
   * Observable instead of an array.</span>
   *
   * <img src="./img/windowCount.png" width="100%">
   *
   * Returns an Observable that emits windows of items it collects from the source
   * Observable. The output Observable emits windows every `startWindowEvery`
   * items, each containing no more than `windowSize` items. When the source
   * Observable completes or encounters an error, the output Observable emits
   * the current window and propagates the notification from the source
   * Observable. If `startWindowEvery` is not provided, then new windows are
   * started immediately at the start of the source and when each window completes
   * with size `windowSize`.
   *
   * @example <caption>Ignore every 3rd click event, starting from the first one</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.windowCount(3)
   *   .map(win => win.skip(1)) // skip first of every 3 clicks
   *   .mergeAll(); // flatten the Observable-of-Observables
   * result.subscribe(x => console.log(x));
   *
   * @example <caption>Ignore every 3rd click event, starting from the third one</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.windowCount(2, 3)
   *   .mergeAll(); // flatten the Observable-of-Observables
   * result.subscribe(x => console.log(x));
   *
   * @see {@link window}
   * @see {@link windowTime}
   * @see {@link windowToggle}
   * @see {@link windowWhen}
   * @see {@link bufferCount}
   *
   * @param {number} windowSize The maximum number of values emitted by each
   * window.
   * @param {number} [startWindowEvery] Interval at which to start a new window.
   * For example if `startWindowEvery` is `2`, then a new window will be started
   * on every other value from the source. A new window is started at the
   * beginning of the source by default.
   * @return {Observable<Observable<T>>} An Observable of windows, which in turn
   * are Observable of values.
   * @method windowCount
   * @owner Observable
   */
  function windowCount(windowSize, startWindowEvery) {
      if (startWindowEvery === void 0) { startWindowEvery = 0; }
      return this.lift(new WindowCountOperator(windowSize, startWindowEvery));
  }
  exports.windowCount = windowCount;
  var WindowCountOperator = (function () {
      function WindowCountOperator(windowSize, startWindowEvery) {
          this.windowSize = windowSize;
          this.startWindowEvery = startWindowEvery;
      }
      WindowCountOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new WindowCountSubscriber(subscriber, this.windowSize, this.startWindowEvery));
      };
      return WindowCountOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var WindowCountSubscriber = (function (_super) {
      __extends(WindowCountSubscriber, _super);
      function WindowCountSubscriber(destination, windowSize, startWindowEvery) {
          _super.call(this, destination);
          this.destination = destination;
          this.windowSize = windowSize;
          this.startWindowEvery = startWindowEvery;
          this.windows = [new Subject_1.Subject()];
          this.count = 0;
          destination.next(this.windows[0]);
      }
      WindowCountSubscriber.prototype._next = function (value) {
          var startWindowEvery = (this.startWindowEvery > 0) ? this.startWindowEvery : this.windowSize;
          var destination = this.destination;
          var windowSize = this.windowSize;
          var windows = this.windows;
          var len = windows.length;
          for (var i = 0; i < len && !this.closed; i++) {
              windows[i].next(value);
          }
          var c = this.count - windowSize + 1;
          if (c >= 0 && c % startWindowEvery === 0 && !this.closed) {
              windows.shift().complete();
          }
          if (++this.count % startWindowEvery === 0 && !this.closed) {
              var window_1 = new Subject_1.Subject();
              windows.push(window_1);
              destination.next(window_1);
          }
      };
      WindowCountSubscriber.prototype._error = function (err) {
          var windows = this.windows;
          if (windows) {
              while (windows.length > 0 && !this.closed) {
                  windows.shift().error(err);
              }
          }
          this.destination.error(err);
      };
      WindowCountSubscriber.prototype._complete = function () {
          var windows = this.windows;
          if (windows) {
              while (windows.length > 0 && !this.closed) {
                  windows.shift().complete();
              }
          }
          this.destination.complete();
      };
      WindowCountSubscriber.prototype._unsubscribe = function () {
          this.count = 0;
          this.windows = null;
      };
      return WindowCountSubscriber;
  }(Subscriber_1.Subscriber));
  //# sourceMappingURL=windowCount.js.map

/***/ },
/* 355 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var async_1 = __webpack_require__(10);
  var Subscriber_1 = __webpack_require__(2);
  /**
   * Branch out the source Observable values as a nested Observable periodically
   * in time.
   *
   * <span class="informal">It's like {@link bufferTime}, but emits a nested
   * Observable instead of an array.</span>
   *
   * <img src="./img/windowTime.png" width="100%">
   *
   * Returns an Observable that emits windows of items it collects from the source
   * Observable. The output Observable starts a new window periodically, as
   * determined by the `windowCreationInterval` argument. It emits each window
   * after a fixed timespan, specified by the `windowTimeSpan` argument. When the
   * source Observable completes or encounters an error, the output Observable
   * emits the current window and propagates the notification from the source
   * Observable. If `windowCreationInterval` is not provided, the output
   * Observable starts a new window when the previous window of duration
   * `windowTimeSpan` completes.
   *
   * @example <caption>In every window of 1 second each, emit at most 2 click events</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.windowTime(1000)
   *   .map(win => win.take(2)) // each window has at most 2 emissions
   *   .mergeAll(); // flatten the Observable-of-Observables
   * result.subscribe(x => console.log(x));
   *
   * @example <caption>Every 5 seconds start a window 1 second long, and emit at most 2 click events per window</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks.windowTime(1000, 5000)
   *   .map(win => win.take(2)) // each window has at most 2 emissions
   *   .mergeAll(); // flatten the Observable-of-Observables
   * result.subscribe(x => console.log(x));
   *
   * @see {@link window}
   * @see {@link windowCount}
   * @see {@link windowToggle}
   * @see {@link windowWhen}
   * @see {@link bufferTime}
   *
   * @param {number} windowTimeSpan The amount of time to fill each window.
   * @param {number} [windowCreationInterval] The interval at which to start new
   * windows.
   * @param {Scheduler} [scheduler=async] The scheduler on which to schedule the
   * intervals that determine window boundaries.
   * @return {Observable<Observable<T>>} An observable of windows, which in turn
   * are Observables.
   * @method windowTime
   * @owner Observable
   */
  function windowTime(windowTimeSpan, windowCreationInterval, scheduler) {
      if (windowCreationInterval === void 0) { windowCreationInterval = null; }
      if (scheduler === void 0) { scheduler = async_1.async; }
      return this.lift(new WindowTimeOperator(windowTimeSpan, windowCreationInterval, scheduler));
  }
  exports.windowTime = windowTime;
  var WindowTimeOperator = (function () {
      function WindowTimeOperator(windowTimeSpan, windowCreationInterval, scheduler) {
          this.windowTimeSpan = windowTimeSpan;
          this.windowCreationInterval = windowCreationInterval;
          this.scheduler = scheduler;
      }
      WindowTimeOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new WindowTimeSubscriber(subscriber, this.windowTimeSpan, this.windowCreationInterval, this.scheduler));
      };
      return WindowTimeOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var WindowTimeSubscriber = (function (_super) {
      __extends(WindowTimeSubscriber, _super);
      function WindowTimeSubscriber(destination, windowTimeSpan, windowCreationInterval, scheduler) {
          _super.call(this, destination);
          this.destination = destination;
          this.windowTimeSpan = windowTimeSpan;
          this.windowCreationInterval = windowCreationInterval;
          this.scheduler = scheduler;
          this.windows = [];
          if (windowCreationInterval !== null && windowCreationInterval >= 0) {
              var window_1 = this.openWindow();
              var closeState = { subscriber: this, window: window_1, context: null };
              var creationState = { windowTimeSpan: windowTimeSpan, windowCreationInterval: windowCreationInterval, subscriber: this, scheduler: scheduler };
              this.add(scheduler.schedule(dispatchWindowClose, windowTimeSpan, closeState));
              this.add(scheduler.schedule(dispatchWindowCreation, windowCreationInterval, creationState));
          }
          else {
              var window_2 = this.openWindow();
              var timeSpanOnlyState = { subscriber: this, window: window_2, windowTimeSpan: windowTimeSpan };
              this.add(scheduler.schedule(dispatchWindowTimeSpanOnly, windowTimeSpan, timeSpanOnlyState));
          }
      }
      WindowTimeSubscriber.prototype._next = function (value) {
          var windows = this.windows;
          var len = windows.length;
          for (var i = 0; i < len; i++) {
              var window_3 = windows[i];
              if (!window_3.closed) {
                  window_3.next(value);
              }
          }
      };
      WindowTimeSubscriber.prototype._error = function (err) {
          var windows = this.windows;
          while (windows.length > 0) {
              windows.shift().error(err);
          }
          this.destination.error(err);
      };
      WindowTimeSubscriber.prototype._complete = function () {
          var windows = this.windows;
          while (windows.length > 0) {
              var window_4 = windows.shift();
              if (!window_4.closed) {
                  window_4.complete();
              }
          }
          this.destination.complete();
      };
      WindowTimeSubscriber.prototype.openWindow = function () {
          var window = new Subject_1.Subject();
          this.windows.push(window);
          var destination = this.destination;
          destination.next(window);
          return window;
      };
      WindowTimeSubscriber.prototype.closeWindow = function (window) {
          window.complete();
          var windows = this.windows;
          windows.splice(windows.indexOf(window), 1);
      };
      return WindowTimeSubscriber;
  }(Subscriber_1.Subscriber));
  function dispatchWindowTimeSpanOnly(state) {
      var subscriber = state.subscriber, windowTimeSpan = state.windowTimeSpan, window = state.window;
      if (window) {
          window.complete();
      }
      state.window = subscriber.openWindow();
      this.schedule(state, windowTimeSpan);
  }
  function dispatchWindowCreation(state) {
      var windowTimeSpan = state.windowTimeSpan, subscriber = state.subscriber, scheduler = state.scheduler, windowCreationInterval = state.windowCreationInterval;
      var window = subscriber.openWindow();
      var action = this;
      var context = { action: action, subscription: null };
      var timeSpanState = { subscriber: subscriber, window: window, context: context };
      context.subscription = scheduler.schedule(dispatchWindowClose, windowTimeSpan, timeSpanState);
      action.add(context.subscription);
      action.schedule(state, windowCreationInterval);
  }
  function dispatchWindowClose(arg) {
      var subscriber = arg.subscriber, window = arg.window, context = arg.context;
      if (context && context.action && context.subscription) {
          context.action.remove(context.subscription);
      }
      subscriber.closeWindow(window);
  }
  //# sourceMappingURL=windowTime.js.map

/***/ },
/* 356 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var Subscription_1 = __webpack_require__(6);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Branch out the source Observable values as a nested Observable starting from
   * an emission from `openings` and ending when the output of `closingSelector`
   * emits.
   *
   * <span class="informal">It's like {@link bufferToggle}, but emits a nested
   * Observable instead of an array.</span>
   *
   * <img src="./img/windowToggle.png" width="100%">
   *
   * Returns an Observable that emits windows of items it collects from the source
   * Observable. The output Observable emits windows that contain those items
   * emitted by the source Observable between the time when the `openings`
   * Observable emits an item and when the Observable returned by
   * `closingSelector` emits an item.
   *
   * @example <caption>Every other second, emit the click events from the next 500ms</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var openings = Rx.Observable.interval(1000);
   * var result = clicks.windowToggle(openings, i =>
   *   i % 2 ? Rx.Observable.interval(500) : Rx.Observable.empty()
   * ).mergeAll();
   * result.subscribe(x => console.log(x));
   *
   * @see {@link window}
   * @see {@link windowCount}
   * @see {@link windowTime}
   * @see {@link windowWhen}
   * @see {@link bufferToggle}
   *
   * @param {Observable<O>} openings An observable of notifications to start new
   * windows.
   * @param {function(value: O): Observable} closingSelector A function that takes
   * the value emitted by the `openings` observable and returns an Observable,
   * which, when it emits (either `next` or `complete`), signals that the
   * associated window should complete.
   * @return {Observable<Observable<T>>} An observable of windows, which in turn
   * are Observables.
   * @method windowToggle
   * @owner Observable
   */
  function windowToggle(openings, closingSelector) {
      return this.lift(new WindowToggleOperator(openings, closingSelector));
  }
  exports.windowToggle = windowToggle;
  var WindowToggleOperator = (function () {
      function WindowToggleOperator(openings, closingSelector) {
          this.openings = openings;
          this.closingSelector = closingSelector;
      }
      WindowToggleOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new WindowToggleSubscriber(subscriber, this.openings, this.closingSelector));
      };
      return WindowToggleOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var WindowToggleSubscriber = (function (_super) {
      __extends(WindowToggleSubscriber, _super);
      function WindowToggleSubscriber(destination, openings, closingSelector) {
          _super.call(this, destination);
          this.openings = openings;
          this.closingSelector = closingSelector;
          this.contexts = [];
          this.add(this.openSubscription = subscribeToResult_1.subscribeToResult(this, openings, openings));
      }
      WindowToggleSubscriber.prototype._next = function (value) {
          var contexts = this.contexts;
          if (contexts) {
              var len = contexts.length;
              for (var i = 0; i < len; i++) {
                  contexts[i].window.next(value);
              }
          }
      };
      WindowToggleSubscriber.prototype._error = function (err) {
          var contexts = this.contexts;
          this.contexts = null;
          if (contexts) {
              var len = contexts.length;
              var index = -1;
              while (++index < len) {
                  var context = contexts[index];
                  context.window.error(err);
                  context.subscription.unsubscribe();
              }
          }
          _super.prototype._error.call(this, err);
      };
      WindowToggleSubscriber.prototype._complete = function () {
          var contexts = this.contexts;
          this.contexts = null;
          if (contexts) {
              var len = contexts.length;
              var index = -1;
              while (++index < len) {
                  var context = contexts[index];
                  context.window.complete();
                  context.subscription.unsubscribe();
              }
          }
          _super.prototype._complete.call(this);
      };
      WindowToggleSubscriber.prototype._unsubscribe = function () {
          var contexts = this.contexts;
          this.contexts = null;
          if (contexts) {
              var len = contexts.length;
              var index = -1;
              while (++index < len) {
                  var context = contexts[index];
                  context.window.unsubscribe();
                  context.subscription.unsubscribe();
              }
          }
      };
      WindowToggleSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          if (outerValue === this.openings) {
              var closingSelector = this.closingSelector;
              var closingNotifier = tryCatch_1.tryCatch(closingSelector)(innerValue);
              if (closingNotifier === errorObject_1.errorObject) {
                  return this.error(errorObject_1.errorObject.e);
              }
              else {
                  var window_1 = new Subject_1.Subject();
                  var subscription = new Subscription_1.Subscription();
                  var context = { window: window_1, subscription: subscription };
                  this.contexts.push(context);
                  var innerSubscription = subscribeToResult_1.subscribeToResult(this, closingNotifier, context);
                  if (innerSubscription.closed) {
                      this.closeWindow(this.contexts.length - 1);
                  }
                  else {
                      innerSubscription.context = context;
                      subscription.add(innerSubscription);
                  }
                  this.destination.next(window_1);
              }
          }
          else {
              this.closeWindow(this.contexts.indexOf(outerValue));
          }
      };
      WindowToggleSubscriber.prototype.notifyError = function (err) {
          this.error(err);
      };
      WindowToggleSubscriber.prototype.notifyComplete = function (inner) {
          if (inner !== this.openSubscription) {
              this.closeWindow(this.contexts.indexOf(inner.context));
          }
      };
      WindowToggleSubscriber.prototype.closeWindow = function (index) {
          if (index === -1) {
              return;
          }
          var contexts = this.contexts;
          var context = contexts[index];
          var window = context.window, subscription = context.subscription;
          contexts.splice(index, 1);
          window.complete();
          subscription.unsubscribe();
      };
      return WindowToggleSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=windowToggle.js.map

/***/ },
/* 357 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var tryCatch_1 = __webpack_require__(8);
  var errorObject_1 = __webpack_require__(7);
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /**
   * Branch out the source Observable values as a nested Observable using a
   * factory function of closing Observables to determine when to start a new
   * window.
   *
   * <span class="informal">It's like {@link bufferWhen}, but emits a nested
   * Observable instead of an array.</span>
   *
   * <img src="./img/windowWhen.png" width="100%">
   *
   * Returns an Observable that emits windows of items it collects from the source
   * Observable. The output Observable emits connected, non-overlapping windows.
   * It emits the current window and opens a new one whenever the Observable
   * produced by the specified `closingSelector` function emits an item. The first
   * window is opened immediately when subscribing to the output Observable.
   *
   * @example <caption>Emit only the first two clicks events in every window of [1-5] random seconds</caption>
   * var clicks = Rx.Observable.fromEvent(document, 'click');
   * var result = clicks
   *   .windowWhen(() => Rx.Observable.interval(1000 + Math.random() * 4000))
   *   .map(win => win.take(2)) // each window has at most 2 emissions
   *   .mergeAll(); // flatten the Observable-of-Observables
   * result.subscribe(x => console.log(x));
   *
   * @see {@link window}
   * @see {@link windowCount}
   * @see {@link windowTime}
   * @see {@link windowToggle}
   * @see {@link bufferWhen}
   *
   * @param {function(): Observable} closingSelector A function that takes no
   * arguments and returns an Observable that signals (on either `next` or
   * `complete`) when to close the previous window and start a new one.
   * @return {Observable<Observable<T>>} An observable of windows, which in turn
   * are Observables.
   * @method windowWhen
   * @owner Observable
   */
  function windowWhen(closingSelector) {
      return this.lift(new WindowOperator(closingSelector));
  }
  exports.windowWhen = windowWhen;
  var WindowOperator = (function () {
      function WindowOperator(closingSelector) {
          this.closingSelector = closingSelector;
      }
      WindowOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new WindowSubscriber(subscriber, this.closingSelector));
      };
      return WindowOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var WindowSubscriber = (function (_super) {
      __extends(WindowSubscriber, _super);
      function WindowSubscriber(destination, closingSelector) {
          _super.call(this, destination);
          this.destination = destination;
          this.closingSelector = closingSelector;
          this.openWindow();
      }
      WindowSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.openWindow(innerSub);
      };
      WindowSubscriber.prototype.notifyError = function (error, innerSub) {
          this._error(error);
      };
      WindowSubscriber.prototype.notifyComplete = function (innerSub) {
          this.openWindow(innerSub);
      };
      WindowSubscriber.prototype._next = function (value) {
          this.window.next(value);
      };
      WindowSubscriber.prototype._error = function (err) {
          this.window.error(err);
          this.destination.error(err);
          this.unsubscribeClosingNotification();
      };
      WindowSubscriber.prototype._complete = function () {
          this.window.complete();
          this.destination.complete();
          this.unsubscribeClosingNotification();
      };
      WindowSubscriber.prototype.unsubscribeClosingNotification = function () {
          if (this.closingNotification) {
              this.closingNotification.unsubscribe();
          }
      };
      WindowSubscriber.prototype.openWindow = function (innerSub) {
          if (innerSub === void 0) { innerSub = null; }
          if (innerSub) {
              this.remove(innerSub);
              innerSub.unsubscribe();
          }
          var prevWindow = this.window;
          if (prevWindow) {
              prevWindow.complete();
          }
          var window = this.window = new Subject_1.Subject();
          this.destination.next(window);
          var closingNotifier = tryCatch_1.tryCatch(this.closingSelector)();
          if (closingNotifier === errorObject_1.errorObject) {
              var err = errorObject_1.errorObject.e;
              this.destination.error(err);
              this.window.error(err);
          }
          else {
              this.add(this.closingNotification = subscribeToResult_1.subscribeToResult(this, closingNotifier));
          }
      };
      return WindowSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=windowWhen.js.map

/***/ },
/* 358 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var OuterSubscriber_1 = __webpack_require__(3);
  var subscribeToResult_1 = __webpack_require__(4);
  /* tslint:disable:max-line-length */
  function withLatestFrom() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
          args[_i - 0] = arguments[_i];
      }
      var project;
      if (typeof args[args.length - 1] === 'function') {
          project = args.pop();
      }
      var observables = args;
      return this.lift(new WithLatestFromOperator(observables, project));
  }
  exports.withLatestFrom = withLatestFrom;
  var WithLatestFromOperator = (function () {
      function WithLatestFromOperator(observables, project) {
          this.observables = observables;
          this.project = project;
      }
      WithLatestFromOperator.prototype.call = function (subscriber, source) {
          return source._subscribe(new WithLatestFromSubscriber(subscriber, this.observables, this.project));
      };
      return WithLatestFromOperator;
  }());
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var WithLatestFromSubscriber = (function (_super) {
      __extends(WithLatestFromSubscriber, _super);
      function WithLatestFromSubscriber(destination, observables, project) {
          _super.call(this, destination);
          this.observables = observables;
          this.project = project;
          this.toRespond = [];
          var len = observables.length;
          this.values = new Array(len);
          for (var i = 0; i < len; i++) {
              this.toRespond.push(i);
          }
          for (var i = 0; i < len; i++) {
              var observable = observables[i];
              this.add(subscribeToResult_1.subscribeToResult(this, observable, observable, i));
          }
      }
      WithLatestFromSubscriber.prototype.notifyNext = function (outerValue, innerValue, outerIndex, innerIndex, innerSub) {
          this.values[outerIndex] = innerValue;
          var toRespond = this.toRespond;
          if (toRespond.length > 0) {
              var found = toRespond.indexOf(outerIndex);
              if (found !== -1) {
                  toRespond.splice(found, 1);
              }
          }
      };
      WithLatestFromSubscriber.prototype.notifyComplete = function () {
          // noop
      };
      WithLatestFromSubscriber.prototype._next = function (value) {
          if (this.toRespond.length === 0) {
              var args = [value].concat(this.values);
              if (this.project) {
                  this._tryProject(args);
              }
              else {
                  this.destination.next(args);
              }
          }
      };
      WithLatestFromSubscriber.prototype._tryProject = function (args) {
          var result;
          try {
              result = this.project.apply(this, args);
          }
          catch (err) {
              this.destination.error(err);
              return;
          }
          this.destination.next(result);
      };
      return WithLatestFromSubscriber;
  }(OuterSubscriber_1.OuterSubscriber));
  //# sourceMappingURL=withLatestFrom.js.map

/***/ },
/* 359 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var zip_1 = __webpack_require__(42);
  /**
   * @param project
   * @return {Observable<R>|WebSocketSubject<T>|Observable<T>}
   * @method zipAll
   * @owner Observable
   */
  function zipAll(project) {
      return this.lift(new zip_1.ZipOperator(project));
  }
  exports.zipAll = zipAll;
  //# sourceMappingURL=zipAll.js.map

/***/ },
/* 360 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subscription_1 = __webpack_require__(6);
  /**
   * A unit of work to be executed in a {@link Scheduler}. An action is typically
   * created from within a Scheduler and an RxJS user does not need to concern
   * themselves about creating and manipulating an Action.
   *
   * ```ts
   * class Action<T> extends Subscription {
   *   new (scheduler: Scheduler, work: (state?: T) => void);
   *   schedule(state?: T, delay: number = 0): Subscription;
   * }
   * ```
   *
   * @class Action<T>
   */
  var Action = (function (_super) {
      __extends(Action, _super);
      function Action(scheduler, work) {
          _super.call(this);
      }
      /**
       * Schedules this action on its parent Scheduler for execution. May be passed
       * some context object, `state`. May happen at some point in the future,
       * according to the `delay` parameter, if specified.
       * @param {T} [state] Some contextual data that the `work` function uses when
       * called by the Scheduler.
       * @param {number} [delay] Time to wait before executing the work, where the
       * time unit is implicit and defined by the Scheduler.
       * @return {void}
       */
      Action.prototype.schedule = function (state, delay) {
          if (delay === void 0) { delay = 0; }
          return this;
      };
      return Action;
  }(Subscription_1.Subscription));
  exports.Action = Action;
  //# sourceMappingURL=Action.js.map

/***/ },
/* 361 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var AsyncAction_1 = __webpack_require__(21);
  var AnimationFrame_1 = __webpack_require__(371);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var AnimationFrameAction = (function (_super) {
      __extends(AnimationFrameAction, _super);
      function AnimationFrameAction(scheduler, work) {
          _super.call(this, scheduler, work);
          this.scheduler = scheduler;
          this.work = work;
      }
      AnimationFrameAction.prototype.requestAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          // If delay is greater than 0, request as an async action.
          if (delay !== null && delay > 0) {
              return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
          }
          // Push the action to the end of the scheduler queue.
          scheduler.actions.push(this);
          // If an animation frame has already been requested, don't request another
          // one. If an animation frame hasn't been requested yet, request one. Return
          // the current animation frame request id.
          return scheduler.scheduled || (scheduler.scheduled = AnimationFrame_1.AnimationFrame.requestAnimationFrame(scheduler.flush.bind(scheduler, null)));
      };
      AnimationFrameAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          // If delay exists and is greater than 0, or if the delay is null (the
          // action wasn't rescheduled) but was originally scheduled as an async
          // action, then recycle as an async action.
          if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
              return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
          }
          // If the scheduler queue is empty, cancel the requested animation frame and
          // set the scheduled flag to undefined so the next AnimationFrameAction will
          // request its own.
          if (scheduler.actions.length === 0) {
              AnimationFrame_1.AnimationFrame.cancelAnimationFrame(id);
              scheduler.scheduled = undefined;
          }
          // Return undefined so the action knows to request a new async id if it's rescheduled.
          return undefined;
      };
      return AnimationFrameAction;
  }(AsyncAction_1.AsyncAction));
  exports.AnimationFrameAction = AnimationFrameAction;
  //# sourceMappingURL=AnimationFrameAction.js.map

/***/ },
/* 362 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var AsyncScheduler_1 = __webpack_require__(22);
  var AnimationFrameScheduler = (function (_super) {
      __extends(AnimationFrameScheduler, _super);
      function AnimationFrameScheduler() {
          _super.apply(this, arguments);
      }
      AnimationFrameScheduler.prototype.flush = function (action) {
          this.active = true;
          this.scheduled = undefined;
          var actions = this.actions;
          var error;
          var index = -1;
          var count = actions.length;
          action = action || actions.shift();
          do {
              if (error = action.execute(action.state, action.delay)) {
                  break;
              }
          } while (++index < count && (action = actions.shift()));
          this.active = false;
          if (error) {
              while (++index < count && (action = actions.shift())) {
                  action.unsubscribe();
              }
              throw error;
          }
      };
      return AnimationFrameScheduler;
  }(AsyncScheduler_1.AsyncScheduler));
  exports.AnimationFrameScheduler = AnimationFrameScheduler;
  //# sourceMappingURL=AnimationFrameScheduler.js.map

/***/ },
/* 363 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Immediate_1 = __webpack_require__(373);
  var AsyncAction_1 = __webpack_require__(21);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var AsapAction = (function (_super) {
      __extends(AsapAction, _super);
      function AsapAction(scheduler, work) {
          _super.call(this, scheduler, work);
          this.scheduler = scheduler;
          this.work = work;
      }
      AsapAction.prototype.requestAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          // If delay is greater than 0, request as an async action.
          if (delay !== null && delay > 0) {
              return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
          }
          // Push the action to the end of the scheduler queue.
          scheduler.actions.push(this);
          // If a microtask has already been scheduled, don't schedule another
          // one. If a microtask hasn't been scheduled yet, schedule one now. Return
          // the current scheduled microtask id.
          return scheduler.scheduled || (scheduler.scheduled = Immediate_1.Immediate.setImmediate(scheduler.flush.bind(scheduler, null)));
      };
      AsapAction.prototype.recycleAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          // If delay exists and is greater than 0, or if the delay is null (the
          // action wasn't rescheduled) but was originally scheduled as an async
          // action, then recycle as an async action.
          if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
              return _super.prototype.recycleAsyncId.call(this, scheduler, id, delay);
          }
          // If the scheduler queue is empty, cancel the requested microtask and
          // set the scheduled flag to undefined so the next AsapAction will schedule
          // its own.
          if (scheduler.actions.length === 0) {
              Immediate_1.Immediate.clearImmediate(id);
              scheduler.scheduled = undefined;
          }
          // Return undefined so the action knows to request a new async id if it's rescheduled.
          return undefined;
      };
      return AsapAction;
  }(AsyncAction_1.AsyncAction));
  exports.AsapAction = AsapAction;
  //# sourceMappingURL=AsapAction.js.map

/***/ },
/* 364 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var AsyncScheduler_1 = __webpack_require__(22);
  var AsapScheduler = (function (_super) {
      __extends(AsapScheduler, _super);
      function AsapScheduler() {
          _super.apply(this, arguments);
      }
      AsapScheduler.prototype.flush = function (action) {
          this.active = true;
          this.scheduled = undefined;
          var actions = this.actions;
          var error;
          var index = -1;
          var count = actions.length;
          action = action || actions.shift();
          do {
              if (error = action.execute(action.state, action.delay)) {
                  break;
              }
          } while (++index < count && (action = actions.shift()));
          this.active = false;
          if (error) {
              while (++index < count && (action = actions.shift())) {
                  action.unsubscribe();
              }
              throw error;
          }
      };
      return AsapScheduler;
  }(AsyncScheduler_1.AsyncScheduler));
  exports.AsapScheduler = AsapScheduler;
  //# sourceMappingURL=AsapScheduler.js.map

/***/ },
/* 365 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var AsyncAction_1 = __webpack_require__(21);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var QueueAction = (function (_super) {
      __extends(QueueAction, _super);
      function QueueAction(scheduler, work) {
          _super.call(this, scheduler, work);
          this.scheduler = scheduler;
          this.work = work;
      }
      QueueAction.prototype.schedule = function (state, delay) {
          if (delay === void 0) { delay = 0; }
          if (delay > 0) {
              return _super.prototype.schedule.call(this, state, delay);
          }
          this.delay = delay;
          this.state = state;
          this.scheduler.flush(this);
          return this;
      };
      QueueAction.prototype.execute = function (state, delay) {
          return (delay > 0 || this.closed) ?
              _super.prototype.execute.call(this, state, delay) :
              this._execute(state, delay);
      };
      QueueAction.prototype.requestAsyncId = function (scheduler, id, delay) {
          if (delay === void 0) { delay = 0; }
          // If delay exists and is greater than 0, or if the delay is null (the
          // action wasn't rescheduled) but was originally scheduled as an async
          // action, then recycle as an async action.
          if ((delay !== null && delay > 0) || (delay === null && this.delay > 0)) {
              return _super.prototype.requestAsyncId.call(this, scheduler, id, delay);
          }
          // Otherwise flush the scheduler starting with this action.
          return scheduler.flush(this);
      };
      return QueueAction;
  }(AsyncAction_1.AsyncAction));
  exports.QueueAction = QueueAction;
  //# sourceMappingURL=QueueAction.js.map

/***/ },
/* 366 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var AsyncScheduler_1 = __webpack_require__(22);
  var QueueScheduler = (function (_super) {
      __extends(QueueScheduler, _super);
      function QueueScheduler() {
          _super.apply(this, arguments);
      }
      return QueueScheduler;
  }(AsyncScheduler_1.AsyncScheduler));
  exports.QueueScheduler = QueueScheduler;
  //# sourceMappingURL=QueueScheduler.js.map

/***/ },
/* 367 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var AnimationFrameAction_1 = __webpack_require__(361);
  var AnimationFrameScheduler_1 = __webpack_require__(362);
  exports.animationFrame = new AnimationFrameScheduler_1.AnimationFrameScheduler(AnimationFrameAction_1.AnimationFrameAction);
  //# sourceMappingURL=animationFrame.js.map

/***/ },
/* 368 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var Subscription_1 = __webpack_require__(6);
  var SubscriptionLoggable_1 = __webpack_require__(73);
  var applyMixins_1 = __webpack_require__(76);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var ColdObservable = (function (_super) {
      __extends(ColdObservable, _super);
      function ColdObservable(messages, scheduler) {
          _super.call(this, function (subscriber) {
              var observable = this;
              var index = observable.logSubscribedFrame();
              subscriber.add(new Subscription_1.Subscription(function () {
                  observable.logUnsubscribedFrame(index);
              }));
              observable.scheduleMessages(subscriber);
              return subscriber;
          });
          this.messages = messages;
          this.subscriptions = [];
          this.scheduler = scheduler;
      }
      ColdObservable.prototype.scheduleMessages = function (subscriber) {
          var messagesLength = this.messages.length;
          for (var i = 0; i < messagesLength; i++) {
              var message = this.messages[i];
              subscriber.add(this.scheduler.schedule(function (_a) {
                  var message = _a.message, subscriber = _a.subscriber;
                  message.notification.observe(subscriber);
              }, message.frame, { message: message, subscriber: subscriber }));
          }
      };
      return ColdObservable;
  }(Observable_1.Observable));
  exports.ColdObservable = ColdObservable;
  applyMixins_1.applyMixins(ColdObservable, [SubscriptionLoggable_1.SubscriptionLoggable]);
  //# sourceMappingURL=ColdObservable.js.map

/***/ },
/* 369 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Subject_1 = __webpack_require__(5);
  var Subscription_1 = __webpack_require__(6);
  var SubscriptionLoggable_1 = __webpack_require__(73);
  var applyMixins_1 = __webpack_require__(76);
  /**
   * We need this JSDoc comment for affecting ESDoc.
   * @ignore
   * @extends {Ignored}
   */
  var HotObservable = (function (_super) {
      __extends(HotObservable, _super);
      function HotObservable(messages, scheduler) {
          _super.call(this);
          this.messages = messages;
          this.subscriptions = [];
          this.scheduler = scheduler;
      }
      HotObservable.prototype._subscribe = function (subscriber) {
          var subject = this;
          var index = subject.logSubscribedFrame();
          subscriber.add(new Subscription_1.Subscription(function () {
              subject.logUnsubscribedFrame(index);
          }));
          return _super.prototype._subscribe.call(this, subscriber);
      };
      HotObservable.prototype.setup = function () {
          var subject = this;
          var messagesLength = subject.messages.length;
          /* tslint:disable:no-var-keyword */
          for (var i = 0; i < messagesLength; i++) {
              (function () {
                  var message = subject.messages[i];
                  /* tslint:enable */
                  subject.scheduler.schedule(function () { message.notification.observe(subject); }, message.frame);
              })();
          }
      };
      return HotObservable;
  }(Subject_1.Subject));
  exports.HotObservable = HotObservable;
  applyMixins_1.applyMixins(HotObservable, [SubscriptionLoggable_1.SubscriptionLoggable]);
  //# sourceMappingURL=HotObservable.js.map

/***/ },
/* 370 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var Observable_1 = __webpack_require__(1);
  var Notification_1 = __webpack_require__(20);
  var ColdObservable_1 = __webpack_require__(368);
  var HotObservable_1 = __webpack_require__(369);
  var SubscriptionLog_1 = __webpack_require__(72);
  var VirtualTimeScheduler_1 = __webpack_require__(69);
  var defaultMaxFrame = 750;
  var TestScheduler = (function (_super) {
      __extends(TestScheduler, _super);
      function TestScheduler(assertDeepEqual) {
          _super.call(this, VirtualTimeScheduler_1.VirtualAction, defaultMaxFrame);
          this.assertDeepEqual = assertDeepEqual;
          this.hotObservables = [];
          this.coldObservables = [];
          this.flushTests = [];
      }
      TestScheduler.prototype.createTime = function (marbles) {
          var indexOf = marbles.indexOf('|');
          if (indexOf === -1) {
              throw new Error('marble diagram for time should have a completion marker "|"');
          }
          return indexOf * TestScheduler.frameTimeFactor;
      };
      TestScheduler.prototype.createColdObservable = function (marbles, values, error) {
          if (marbles.indexOf('^') !== -1) {
              throw new Error('cold observable cannot have subscription offset "^"');
          }
          if (marbles.indexOf('!') !== -1) {
              throw new Error('cold observable cannot have unsubscription marker "!"');
          }
          var messages = TestScheduler.parseMarbles(marbles, values, error);
          var cold = new ColdObservable_1.ColdObservable(messages, this);
          this.coldObservables.push(cold);
          return cold;
      };
      TestScheduler.prototype.createHotObservable = function (marbles, values, error) {
          if (marbles.indexOf('!') !== -1) {
              throw new Error('hot observable cannot have unsubscription marker "!"');
          }
          var messages = TestScheduler.parseMarbles(marbles, values, error);
          var subject = new HotObservable_1.HotObservable(messages, this);
          this.hotObservables.push(subject);
          return subject;
      };
      TestScheduler.prototype.materializeInnerObservable = function (observable, outerFrame) {
          var _this = this;
          var messages = [];
          observable.subscribe(function (value) {
              messages.push({ frame: _this.frame - outerFrame, notification: Notification_1.Notification.createNext(value) });
          }, function (err) {
              messages.push({ frame: _this.frame - outerFrame, notification: Notification_1.Notification.createError(err) });
          }, function () {
              messages.push({ frame: _this.frame - outerFrame, notification: Notification_1.Notification.createComplete() });
          });
          return messages;
      };
      TestScheduler.prototype.expectObservable = function (observable, unsubscriptionMarbles) {
          var _this = this;
          if (unsubscriptionMarbles === void 0) { unsubscriptionMarbles = null; }
          var actual = [];
          var flushTest = { actual: actual, ready: false };
          var unsubscriptionFrame = TestScheduler
              .parseMarblesAsSubscriptions(unsubscriptionMarbles).unsubscribedFrame;
          var subscription;
          this.schedule(function () {
              subscription = observable.subscribe(function (x) {
                  var value = x;
                  // Support Observable-of-Observables
                  if (x instanceof Observable_1.Observable) {
                      value = _this.materializeInnerObservable(value, _this.frame);
                  }
                  actual.push({ frame: _this.frame, notification: Notification_1.Notification.createNext(value) });
              }, function (err) {
                  actual.push({ frame: _this.frame, notification: Notification_1.Notification.createError(err) });
              }, function () {
                  actual.push({ frame: _this.frame, notification: Notification_1.Notification.createComplete() });
              });
          }, 0);
          if (unsubscriptionFrame !== Number.POSITIVE_INFINITY) {
              this.schedule(function () { return subscription.unsubscribe(); }, unsubscriptionFrame);
          }
          this.flushTests.push(flushTest);
          return {
              toBe: function (marbles, values, errorValue) {
                  flushTest.ready = true;
                  flushTest.expected = TestScheduler.parseMarbles(marbles, values, errorValue, true);
              }
          };
      };
      TestScheduler.prototype.expectSubscriptions = function (actualSubscriptionLogs) {
          var flushTest = { actual: actualSubscriptionLogs, ready: false };
          this.flushTests.push(flushTest);
          return {
              toBe: function (marbles) {
                  var marblesArray = (typeof marbles === 'string') ? [marbles] : marbles;
                  flushTest.ready = true;
                  flushTest.expected = marblesArray.map(function (marbles) {
                      return TestScheduler.parseMarblesAsSubscriptions(marbles);
                  });
              }
          };
      };
      TestScheduler.prototype.flush = function () {
          var hotObservables = this.hotObservables;
          while (hotObservables.length > 0) {
              hotObservables.shift().setup();
          }
          _super.prototype.flush.call(this);
          var readyFlushTests = this.flushTests.filter(function (test) { return test.ready; });
          while (readyFlushTests.length > 0) {
              var test = readyFlushTests.shift();
              this.assertDeepEqual(test.actual, test.expected);
          }
      };
      TestScheduler.parseMarblesAsSubscriptions = function (marbles) {
          if (typeof marbles !== 'string') {
              return new SubscriptionLog_1.SubscriptionLog(Number.POSITIVE_INFINITY);
          }
          var len = marbles.length;
          var groupStart = -1;
          var subscriptionFrame = Number.POSITIVE_INFINITY;
          var unsubscriptionFrame = Number.POSITIVE_INFINITY;
          for (var i = 0; i < len; i++) {
              var frame = i * this.frameTimeFactor;
              var c = marbles[i];
              switch (c) {
                  case '-':
                  case ' ':
                      break;
                  case '(':
                      groupStart = frame;
                      break;
                  case ')':
                      groupStart = -1;
                      break;
                  case '^':
                      if (subscriptionFrame !== Number.POSITIVE_INFINITY) {
                          throw new Error('found a second subscription point \'^\' in a ' +
                              'subscription marble diagram. There can only be one.');
                      }
                      subscriptionFrame = groupStart > -1 ? groupStart : frame;
                      break;
                  case '!':
                      if (unsubscriptionFrame !== Number.POSITIVE_INFINITY) {
                          throw new Error('found a second subscription point \'^\' in a ' +
                              'subscription marble diagram. There can only be one.');
                      }
                      unsubscriptionFrame = groupStart > -1 ? groupStart : frame;
                      break;
                  default:
                      throw new Error('there can only be \'^\' and \'!\' markers in a ' +
                          'subscription marble diagram. Found instead \'' + c + '\'.');
              }
          }
          if (unsubscriptionFrame < 0) {
              return new SubscriptionLog_1.SubscriptionLog(subscriptionFrame);
          }
          else {
              return new SubscriptionLog_1.SubscriptionLog(subscriptionFrame, unsubscriptionFrame);
          }
      };
      TestScheduler.parseMarbles = function (marbles, values, errorValue, materializeInnerObservables) {
          if (materializeInnerObservables === void 0) { materializeInnerObservables = false; }
          if (marbles.indexOf('!') !== -1) {
              throw new Error('conventional marble diagrams cannot have the ' +
                  'unsubscription marker "!"');
          }
          var len = marbles.length;
          var testMessages = [];
          var subIndex = marbles.indexOf('^');
          var frameOffset = subIndex === -1 ? 0 : (subIndex * -this.frameTimeFactor);
          var getValue = typeof values !== 'object' ?
              function (x) { return x; } :
              function (x) {
                  // Support Observable-of-Observables
                  if (materializeInnerObservables && values[x] instanceof ColdObservable_1.ColdObservable) {
                      return values[x].messages;
                  }
                  return values[x];
              };
          var groupStart = -1;
          for (var i = 0; i < len; i++) {
              var frame = i * this.frameTimeFactor + frameOffset;
              var notification = void 0;
              var c = marbles[i];
              switch (c) {
                  case '-':
                  case ' ':
                      break;
                  case '(':
                      groupStart = frame;
                      break;
                  case ')':
                      groupStart = -1;
                      break;
                  case '|':
                      notification = Notification_1.Notification.createComplete();
                      break;
                  case '^':
                      break;
                  case '#':
                      notification = Notification_1.Notification.createError(errorValue || 'error');
                      break;
                  default:
                      notification = Notification_1.Notification.createNext(getValue(c));
                      break;
              }
              if (notification) {
                  testMessages.push({ frame: groupStart > -1 ? groupStart : frame, notification: notification });
              }
          }
          return testMessages;
      };
      return TestScheduler;
  }(VirtualTimeScheduler_1.VirtualTimeScheduler));
  exports.TestScheduler = TestScheduler;
  //# sourceMappingURL=TestScheduler.js.map

/***/ },
/* 371 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var RequestAnimationFrameDefinition = (function () {
      function RequestAnimationFrameDefinition(root) {
          if (root.requestAnimationFrame) {
              this.cancelAnimationFrame = root.cancelAnimationFrame.bind(root);
              this.requestAnimationFrame = root.requestAnimationFrame.bind(root);
          }
          else if (root.mozRequestAnimationFrame) {
              this.cancelAnimationFrame = root.mozCancelAnimationFrame.bind(root);
              this.requestAnimationFrame = root.mozRequestAnimationFrame.bind(root);
          }
          else if (root.webkitRequestAnimationFrame) {
              this.cancelAnimationFrame = root.webkitCancelAnimationFrame.bind(root);
              this.requestAnimationFrame = root.webkitRequestAnimationFrame.bind(root);
          }
          else if (root.msRequestAnimationFrame) {
              this.cancelAnimationFrame = root.msCancelAnimationFrame.bind(root);
              this.requestAnimationFrame = root.msRequestAnimationFrame.bind(root);
          }
          else if (root.oRequestAnimationFrame) {
              this.cancelAnimationFrame = root.oCancelAnimationFrame.bind(root);
              this.requestAnimationFrame = root.oRequestAnimationFrame.bind(root);
          }
          else {
              this.cancelAnimationFrame = root.clearTimeout.bind(root);
              this.requestAnimationFrame = function (cb) { return root.setTimeout(cb, 1000 / 60); };
          }
      }
      return RequestAnimationFrameDefinition;
  }());
  exports.RequestAnimationFrameDefinition = RequestAnimationFrameDefinition;
  exports.AnimationFrame = new RequestAnimationFrameDefinition(root_1.root);
  //# sourceMappingURL=AnimationFrame.js.map

/***/ },
/* 372 */
/***/ function(module, exports) {

  "use strict";
  var FastMap = (function () {
      function FastMap() {
          this.values = {};
      }
      FastMap.prototype.delete = function (key) {
          this.values[key] = null;
          return true;
      };
      FastMap.prototype.set = function (key, value) {
          this.values[key] = value;
          return this;
      };
      FastMap.prototype.get = function (key) {
          return this.values[key];
      };
      FastMap.prototype.forEach = function (cb, thisArg) {
          var values = this.values;
          for (var key in values) {
              if (values.hasOwnProperty(key) && values[key] !== null) {
                  cb.call(thisArg, values[key], key);
              }
          }
      };
      FastMap.prototype.clear = function () {
          this.values = {};
      };
      return FastMap;
  }());
  exports.FastMap = FastMap;
  //# sourceMappingURL=FastMap.js.map

/***/ },
/* 373 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(clearImmediate, setImmediate) {/**
  Some credit for this helper goes to http://github.com/YuzuJS/setImmediate
  */
  "use strict";
  var root_1 = __webpack_require__(9);
  var ImmediateDefinition = (function () {
      function ImmediateDefinition(root) {
          this.root = root;
          if (root.setImmediate && typeof root.setImmediate === 'function') {
              this.setImmediate = root.setImmediate.bind(root);
              this.clearImmediate = root.clearImmediate.bind(root);
          }
          else {
              this.nextHandle = 1;
              this.tasksByHandle = {};
              this.currentlyRunningATask = false;
              // Don't get fooled by e.g. browserify environments.
              if (this.canUseProcessNextTick()) {
                  // For Node.js before 0.9
                  this.setImmediate = this.createProcessNextTickSetImmediate();
              }
              else if (this.canUsePostMessage()) {
                  // For non-IE10 modern browsers
                  this.setImmediate = this.createPostMessageSetImmediate();
              }
              else if (this.canUseMessageChannel()) {
                  // For web workers, where supported
                  this.setImmediate = this.createMessageChannelSetImmediate();
              }
              else if (this.canUseReadyStateChange()) {
                  // For IE 6â€“8
                  this.setImmediate = this.createReadyStateChangeSetImmediate();
              }
              else {
                  // For older browsers
                  this.setImmediate = this.createSetTimeoutSetImmediate();
              }
              var ci = function clearImmediate(handle) {
                  delete clearImmediate.instance.tasksByHandle[handle];
              };
              ci.instance = this;
              this.clearImmediate = ci;
          }
      }
      ImmediateDefinition.prototype.identify = function (o) {
          return this.root.Object.prototype.toString.call(o);
      };
      ImmediateDefinition.prototype.canUseProcessNextTick = function () {
          return this.identify(this.root.process) === '[object process]';
      };
      ImmediateDefinition.prototype.canUseMessageChannel = function () {
          return Boolean(this.root.MessageChannel);
      };
      ImmediateDefinition.prototype.canUseReadyStateChange = function () {
          var document = this.root.document;
          return Boolean(document && 'onreadystatechange' in document.createElement('script'));
      };
      ImmediateDefinition.prototype.canUsePostMessage = function () {
          var root = this.root;
          // The test against `importScripts` prevents this implementation from being installed inside a web worker,
          // where `root.postMessage` means something completely different and can't be used for this purpose.
          if (root.postMessage && !root.importScripts) {
              var postMessageIsAsynchronous_1 = true;
              var oldOnMessage = root.onmessage;
              root.onmessage = function () {
                  postMessageIsAsynchronous_1 = false;
              };
              root.postMessage('', '*');
              root.onmessage = oldOnMessage;
              return postMessageIsAsynchronous_1;
          }
          return false;
      };
      // This function accepts the same arguments as setImmediate, but
      // returns a function that requires no arguments.
      ImmediateDefinition.prototype.partiallyApplied = function (handler) {
          var args = [];
          for (var _i = 1; _i < arguments.length; _i++) {
              args[_i - 1] = arguments[_i];
          }
          var fn = function result() {
              var _a = result, handler = _a.handler, args = _a.args;
              if (typeof handler === 'function') {
                  handler.apply(undefined, args);
              }
              else {
                  (new Function('' + handler))();
              }
          };
          fn.handler = handler;
          fn.args = args;
          return fn;
      };
      ImmediateDefinition.prototype.addFromSetImmediateArguments = function (args) {
          this.tasksByHandle[this.nextHandle] = this.partiallyApplied.apply(undefined, args);
          return this.nextHandle++;
      };
      ImmediateDefinition.prototype.createProcessNextTickSetImmediate = function () {
          var fn = function setImmediate() {
              var instance = setImmediate.instance;
              var handle = instance.addFromSetImmediateArguments(arguments);
              instance.root.process.nextTick(instance.partiallyApplied(instance.runIfPresent, handle));
              return handle;
          };
          fn.instance = this;
          return fn;
      };
      ImmediateDefinition.prototype.createPostMessageSetImmediate = function () {
          // Installs an event handler on `global` for the `message` event: see
          // * https://developer.mozilla.org/en/DOM/window.postMessage
          // * http://www.whatwg.org/specs/web-apps/current-work/multipage/comms.html#crossDocumentMessages
          var root = this.root;
          var messagePrefix = 'setImmediate$' + root.Math.random() + '$';
          var onGlobalMessage = function globalMessageHandler(event) {
              var instance = globalMessageHandler.instance;
              if (event.source === root &&
                  typeof event.data === 'string' &&
                  event.data.indexOf(messagePrefix) === 0) {
                  instance.runIfPresent(+event.data.slice(messagePrefix.length));
              }
          };
          onGlobalMessage.instance = this;
          root.addEventListener('message', onGlobalMessage, false);
          var fn = function setImmediate() {
              var _a = setImmediate, messagePrefix = _a.messagePrefix, instance = _a.instance;
              var handle = instance.addFromSetImmediateArguments(arguments);
              instance.root.postMessage(messagePrefix + handle, '*');
              return handle;
          };
          fn.instance = this;
          fn.messagePrefix = messagePrefix;
          return fn;
      };
      ImmediateDefinition.prototype.runIfPresent = function (handle) {
          // From the spec: 'Wait until any invocations of this algorithm started before this one have completed.'
          // So if we're currently running a task, we'll need to delay this invocation.
          if (this.currentlyRunningATask) {
              // Delay by doing a setTimeout. setImmediate was tried instead, but in Firefox 7 it generated a
              // 'too much recursion' error.
              this.root.setTimeout(this.partiallyApplied(this.runIfPresent, handle), 0);
          }
          else {
              var task = this.tasksByHandle[handle];
              if (task) {
                  this.currentlyRunningATask = true;
                  try {
                      task();
                  }
                  finally {
                      this.clearImmediate(handle);
                      this.currentlyRunningATask = false;
                  }
              }
          }
      };
      ImmediateDefinition.prototype.createMessageChannelSetImmediate = function () {
          var _this = this;
          var channel = new this.root.MessageChannel();
          channel.port1.onmessage = function (event) {
              var handle = event.data;
              _this.runIfPresent(handle);
          };
          var fn = function setImmediate() {
              var _a = setImmediate, channel = _a.channel, instance = _a.instance;
              var handle = instance.addFromSetImmediateArguments(arguments);
              channel.port2.postMessage(handle);
              return handle;
          };
          fn.channel = channel;
          fn.instance = this;
          return fn;
      };
      ImmediateDefinition.prototype.createReadyStateChangeSetImmediate = function () {
          var fn = function setImmediate() {
              var instance = setImmediate.instance;
              var root = instance.root;
              var doc = root.document;
              var html = doc.documentElement;
              var handle = instance.addFromSetImmediateArguments(arguments);
              // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
              // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
              var script = doc.createElement('script');
              script.onreadystatechange = function () {
                  instance.runIfPresent(handle);
                  script.onreadystatechange = null;
                  html.removeChild(script);
                  script = null;
              };
              html.appendChild(script);
              return handle;
          };
          fn.instance = this;
          return fn;
      };
      ImmediateDefinition.prototype.createSetTimeoutSetImmediate = function () {
          var fn = function setImmediate() {
              var instance = setImmediate.instance;
              var handle = instance.addFromSetImmediateArguments(arguments);
              instance.root.setTimeout(instance.partiallyApplied(instance.runIfPresent, handle), 0);
              return handle;
          };
          fn.instance = this;
          return fn;
      };
      return ImmediateDefinition;
  }());
  exports.ImmediateDefinition = ImmediateDefinition;
  exports.Immediate = new ImmediateDefinition(root_1.root);
  //# sourceMappingURL=Immediate.js.map
  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(32).clearImmediate, __webpack_require__(32).setImmediate))

/***/ },
/* 374 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var MapPolyfill_1 = __webpack_require__(375);
  exports.Map = root_1.root.Map || (function () { return MapPolyfill_1.MapPolyfill; })();
  //# sourceMappingURL=Map.js.map

/***/ },
/* 375 */
/***/ function(module, exports) {

  "use strict";
  var MapPolyfill = (function () {
      function MapPolyfill() {
          this.size = 0;
          this._values = [];
          this._keys = [];
      }
      MapPolyfill.prototype.get = function (key) {
          var i = this._keys.indexOf(key);
          return i === -1 ? undefined : this._values[i];
      };
      MapPolyfill.prototype.set = function (key, value) {
          var i = this._keys.indexOf(key);
          if (i === -1) {
              this._keys.push(key);
              this._values.push(value);
              this.size++;
          }
          else {
              this._values[i] = value;
          }
          return this;
      };
      MapPolyfill.prototype.delete = function (key) {
          var i = this._keys.indexOf(key);
          if (i === -1) {
              return false;
          }
          this._values.splice(i, 1);
          this._keys.splice(i, 1);
          this.size--;
          return true;
      };
      MapPolyfill.prototype.clear = function () {
          this._keys.length = 0;
          this._values.length = 0;
          this.size = 0;
      };
      MapPolyfill.prototype.forEach = function (cb, thisArg) {
          for (var i = 0; i < this.size; i++) {
              cb.call(thisArg, this._values[i], this._keys[i]);
          }
      };
      return MapPolyfill;
  }());
  exports.MapPolyfill = MapPolyfill;
  //# sourceMappingURL=MapPolyfill.js.map

/***/ },
/* 376 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var root_1 = __webpack_require__(9);
  var Object = root_1.root.Object;
  if (typeof Object.assign != 'function') {
      (function () {
          Object.assign = function assignPolyfill(target) {
              var sources = [];
              for (var _i = 1; _i < arguments.length; _i++) {
                  sources[_i - 1] = arguments[_i];
              }
              if (target === undefined || target === null) {
                  throw new TypeError('cannot convert undefined or null to object');
              }
              var output = Object(target);
              var len = sources.length;
              for (var index = 0; index < len; index++) {
                  var source = sources[index];
                  if (source !== undefined && source !== null) {
                      for (var key in source) {
                          if (source.hasOwnProperty(key)) {
                              output[key] = source[key];
                          }
                      }
                  }
              }
              return output;
          };
      })();
  }
  exports.assign = Object.assign;
  //# sourceMappingURL=assign.js.map

/***/ },
/* 377 */
/***/ function(module, exports) {

  "use strict";
  function isObject(x) {
      return x != null && typeof x === 'object';
  }
  exports.isObject = isObject;
  //# sourceMappingURL=isObject.js.map

/***/ },
/* 378 */
/***/ function(module, exports) {

  "use strict";
  function not(pred, thisArg) {
      function notPred() {
          return !(notPred.pred.apply(notPred.thisArg, arguments));
      }
      notPred.pred = pred;
      notPred.thisArg = thisArg;
      return notPred;
  }
  exports.not = not;
  //# sourceMappingURL=not.js.map

/***/ },
/* 379 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";
  var Subscriber_1 = __webpack_require__(2);
  var rxSubscriber_1 = __webpack_require__(28);
  var Observer_1 = __webpack_require__(53);
  function toSubscriber(nextOrObserver, error, complete) {
      if (nextOrObserver) {
          if (nextOrObserver instanceof Subscriber_1.Subscriber) {
              return nextOrObserver;
          }
          if (nextOrObserver[rxSubscriber_1.$$rxSubscriber]) {
              return nextOrObserver[rxSubscriber_1.$$rxSubscriber]();
          }
      }
      if (!nextOrObserver && !error && !complete) {
          return new Subscriber_1.Subscriber(Observer_1.empty);
      }
      return new Subscriber_1.Subscriber(nextOrObserver, error, complete);
  }
  exports.toSubscriber = toSubscriber;
  //# sourceMappingURL=toSubscriber.js.map

/***/ },
/* 380 */
/***/ function(module, exports, __webpack_require__) {

  
  /**
   * Module dependencies.
   */

  var debug = __webpack_require__(13)('socket.io-parser');
  var json = __webpack_require__(496);
  var isArray = __webpack_require__(85);
  var Emitter = __webpack_require__(88);
  var binary = __webpack_require__(519);
  var isBuf = __webpack_require__(416);

  /**
   * Protocol version.
   *
   * @api public
   */

  exports.protocol = 4;

  /**
   * Packet types.
   *
   * @api public
   */

  exports.types = [
    'CONNECT',
    'DISCONNECT',
    'EVENT',
    'ACK',
    'ERROR',
    'BINARY_EVENT',
    'BINARY_ACK'
  ];

  /**
   * Packet type `connect`.
   *
   * @api public
   */

  exports.CONNECT = 0;

  /**
   * Packet type `disconnect`.
   *
   * @api public
   */

  exports.DISCONNECT = 1;

  /**
   * Packet type `event`.
   *
   * @api public
   */

  exports.EVENT = 2;

  /**
   * Packet type `ack`.
   *
   * @api public
   */

  exports.ACK = 3;

  /**
   * Packet type `error`.
   *
   * @api public
   */

  exports.ERROR = 4;

  /**
   * Packet type 'binary event'
   *
   * @api public
   */

  exports.BINARY_EVENT = 5;

  /**
   * Packet type `binary ack`. For acks with binary arguments.
   *
   * @api public
   */

  exports.BINARY_ACK = 6;

  /**
   * Encoder constructor.
   *
   * @api public
   */

  exports.Encoder = Encoder;

  /**
   * Decoder constructor.
   *
   * @api public
   */

  exports.Decoder = Decoder;

  /**
   * A socket.io Encoder instance
   *
   * @api public
   */

  function Encoder() {}

  /**
   * Encode a packet as a single string if non-binary, or as a
   * buffer sequence, depending on packet type.
   *
   * @param {Object} obj - packet object
   * @param {Function} callback - function to handle encodings (likely engine.write)
   * @return Calls callback with Array of encodings
   * @api public
   */

  Encoder.prototype.encode = function(obj, callback){
    debug('encoding packet %j', obj);

    if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
      encodeAsBinary(obj, callback);
    }
    else {
      var encoding = encodeAsString(obj);
      callback([encoding]);
    }
  };

  /**
   * Encode packet as string.
   *
   * @param {Object} packet
   * @return {String} encoded
   * @api private
   */

  function encodeAsString(obj) {
    var str = '';
    var nsp = false;

    // first is type
    str += obj.type;

    // attachments if we have them
    if (exports.BINARY_EVENT == obj.type || exports.BINARY_ACK == obj.type) {
      str += obj.attachments;
      str += '-';
    }

    // if we have a namespace other than `/`
    // we append it followed by a comma `,`
    if (obj.nsp && '/' != obj.nsp) {
      nsp = true;
      str += obj.nsp;
    }

    // immediately followed by the id
    if (null != obj.id) {
      if (nsp) {
        str += ',';
        nsp = false;
      }
      str += obj.id;
    }

    // json data
    if (null != obj.data) {
      if (nsp) str += ',';
      str += json.stringify(obj.data);
    }

    debug('encoded %j as %s', obj, str);
    return str;
  }

  /**
   * Encode packet as 'buffer sequence' by removing blobs, and
   * deconstructing packet into object with placeholders and
   * a list of buffers.
   *
   * @param {Object} packet
   * @return {Buffer} encoded
   * @api private
   */

  function encodeAsBinary(obj, callback) {

    function writeEncoding(bloblessData) {
      var deconstruction = binary.deconstructPacket(bloblessData);
      var pack = encodeAsString(deconstruction.packet);
      var buffers = deconstruction.buffers;

      buffers.unshift(pack); // add packet info to beginning of data list
      callback(buffers); // write all the buffers
    }

    binary.removeBlobs(obj, writeEncoding);
  }

  /**
   * A socket.io Decoder instance
   *
   * @return {Object} decoder
   * @api public
   */

  function Decoder() {
    this.reconstructor = null;
  }

  /**
   * Mix in `Emitter` with Decoder.
   */

  Emitter(Decoder.prototype);

  /**
   * Decodes an ecoded packet string into packet JSON.
   *
   * @param {String} obj - encoded packet
   * @return {Object} packet
   * @api public
   */

  Decoder.prototype.add = function(obj) {
    var packet;
    if ('string' == typeof obj) {
      packet = decodeString(obj);
      if (exports.BINARY_EVENT == packet.type || exports.BINARY_ACK == packet.type) { // binary packet's json
        this.reconstructor = new BinaryReconstructor(packet);

        // no attachments, labeled binary but no binary data to follow
        if (this.reconstructor.reconPack.attachments === 0) {
          this.emit('decoded', packet);
        }
      } else { // non-binary full packet
        this.emit('decoded', packet);
      }
    }
    else if (isBuf(obj) || obj.base64) { // raw binary data
      if (!this.reconstructor) {
        throw new Error('got binary data when not reconstructing a packet');
      } else {
        packet = this.reconstructor.takeBinaryData(obj);
        if (packet) { // received final buffer
          this.reconstructor = null;
          this.emit('decoded', packet);
        }
      }
    }
    else {
      throw new Error('Unknown type: ' + obj);
    }
  };

  /**
   * Decode a packet String (JSON data)
   *
   * @param {String} str
   * @return {Object} packet
   * @api private
   */

  function decodeString(str) {
    var p = {};
    var i = 0;

    // look up type
    p.type = Number(str.charAt(0));
    if (null == exports.types[p.type]) return error();

    // look up attachments if type binary
    if (exports.BINARY_EVENT == p.type || exports.BINARY_ACK == p.type) {
      var buf = '';
      while (str.charAt(++i) != '-') {
        buf += str.charAt(i);
        if (i == str.length) break;
      }
      if (buf != Number(buf) || str.charAt(i) != '-') {
        throw new Error('Illegal attachments');
      }
      p.attachments = Number(buf);
    }

    // look up namespace (if any)
    if ('/' == str.charAt(i + 1)) {
      p.nsp = '';
      while (++i) {
        var c = str.charAt(i);
        if (',' == c) break;
        p.nsp += c;
        if (i == str.length) break;
      }
    } else {
      p.nsp = '/';
    }

    // look up id
    var next = str.charAt(i + 1);
    if ('' !== next && Number(next) == next) {
      p.id = '';
      while (++i) {
        var c = str.charAt(i);
        if (null == c || Number(c) != c) {
          --i;
          break;
        }
        p.id += str.charAt(i);
        if (i == str.length) break;
      }
      p.id = Number(p.id);
    }

    // look up json data
    if (str.charAt(++i)) {
      try {
        p.data = json.parse(str.substr(i));
      } catch(e){
        return error();
      }
    }

    debug('decoded %s as %j', str, p);
    return p;
  }

  /**
   * Deallocates a parser's resources
   *
   * @api public
   */

  Decoder.prototype.destroy = function() {
    if (this.reconstructor) {
      this.reconstructor.finishedReconstruction();
    }
  };

  /**
   * A manager of a binary event's 'buffer sequence'. Should
   * be constructed whenever a packet of type BINARY_EVENT is
   * decoded.
   *
   * @param {Object} packet
   * @return {BinaryReconstructor} initialized reconstructor
   * @api private
   */

  function BinaryReconstructor(packet) {
    this.reconPack = packet;
    this.buffers = [];
  }

  /**
   * Method to be called when binary data received from connection
   * after a BINARY_EVENT packet.
   *
   * @param {Buffer | ArrayBuffer} binData - the raw binary data received
   * @return {null | Object} returns null if more binary data is expected or
   *   a reconstructed packet object if all buffers have been received.
   * @api private
   */

  BinaryReconstructor.prototype.takeBinaryData = function(binData) {
    this.buffers.push(binData);
    if (this.buffers.length == this.reconPack.attachments) { // done with buffer list
      var packet = binary.reconstructPacket(this.reconPack, this.buffers);
      this.finishedReconstruction();
      return packet;
    }
    return null;
  };

  /**
   * Cleans up binary packet reconstruction variables.
   *
   * @api private
   */

  BinaryReconstructor.prototype.finishedReconstruction = function() {
    this.reconPack = null;
    this.buffers = [];
  };

  function error(data){
    return {
      type: exports.ERROR,
      data: 'parser error'
    };
  }


/***/ },
/* 381 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var Debug = __webpack_require__(13);
  var Dispatcher_1 = __webpack_require__(383);
  var debug = Debug("decot:config");
  var Config = (function () {
      function Config(config) {
          var _this = this;
          this.loaded = false;
          this.allowToReceiveCallFromAnyone = false;
          this.credential = {};
          this.iceServers =
              [
                  { urls: "stun:stun.l.google.com:19302" },
                  { urls: "stun:stun1.l.google.com:19302" },
                  { urls: "stun:stun2.l.google.com:19302" },
                  { urls: "stun:stun3.l.google.com:19302" },
                  { urls: "stun:stun4.l.google.com:19302" }
              ];
          //this.signalingServerURL = "wss://adawarp-simple-server.herokuapp.com";
          this.signalingServerURL = "ws://callapp.because-why-not.com:12776/callapp";
          this.signalingServerType = "socketio";
          if (config) {
              Object.assign(this, config);
              this.loaded = true;
          }
          Dispatcher_1.default.onConfigChanged.subscribe(function (_a) {
              var key = _a.key, value = _a.value;
              if (["allowToReceiveCallFromAnyone"].indexOf(key) !== -1) {
                  _this[key] = value;
              }
              else {
                  debug("Invalid Configuration key inserted", key, value);
              }
          });
      }
      Config.prototype.loadFromJSON = function (configRaw) {
          try {
              var conf = JSON.parse(configRaw);
              console.log(conf);
              this.signalingServerURL = conf.signalingServerURL;
              this.iceServers = conf.iceServers;
              Object.assign(this, conf);
              return true;
          }
          catch (e) {
              return false;
          }
      };
      Config.prototype.load = function (config) {
          try {
              Object.assign(this, config);
              this.loaded = true;
          }
          catch (e) {
              console.error(e);
          }
      };
      Config.prototype.validate = function () {
          return true;
      };
      return Config;
  }());
  exports.Config = Config;


/***/ },
/* 382 */
/***/ function(module, exports) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  /**
   * SignalingAdapter Abstract Class
   */
  var SignalingAdapter = (function () {
      function SignalingAdapter() {
      }
      Object.defineProperty(SignalingAdapter.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      return SignalingAdapter;
  }());
  exports.SignalingAdapter = SignalingAdapter;


/***/ },
/* 383 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var rxjs_1 = __webpack_require__(24);
  var Dispatcher = {
      onLogin: new rxjs_1.Subject(),
      onServerStatusChanged: new rxjs_1.Subject(),
      onStreamAdd: new rxjs_1.Subject(),
      onLocalStreamAdd: new rxjs_1.Subject(),
      onMediaDeviceCollected: new rxjs_1.Subject(),
      onMediaDeviceSelected: new rxjs_1.Subject(),
      onReceiveChatMessage: new rxjs_1.Subject(),
      onSendChatMessageRequest: new rxjs_1.Subject(),
      onNotifiableError: new rxjs_1.Subject(),
      onConfigChanged: new rxjs_1.Subject(),
      onCreatePlayer: new rxjs_1.Subject(),
      onDeletePlayer: new rxjs_1.Subject()
  };
  Object.defineProperty(exports, "__esModule", { value: true });
  exports.default = Dispatcher;


/***/ },
/* 384 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var SignalingDispatcher_1 = __webpack_require__(385);
  var SignalingActionCreator = (function () {
      function SignalingActionCreator() {
          this._dispatcher = new SignalingDispatcher_1.SignalingDispatcher();
      }
      Object.defineProperty(SignalingActionCreator.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      return SignalingActionCreator;
  }());
  exports.SignalingActionCreator = SignalingActionCreator;


/***/ },
/* 385 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var rxjs_1 = __webpack_require__(24);
  var SignalingDispatcher = (function () {
      function SignalingDispatcher() {
          this.login = new rxjs_1.Subject();
          this.updatePeerList = new rxjs_1.Subject();
          this.serverStatusChanged = new rxjs_1.Subject();
          this.receiveChatMessage = new rxjs_1.Subject();
          this.ringRequest = new rxjs_1.Subject();
          this.ringResponse = new rxjs_1.Subject();
          this.sendIceCandidate = new rxjs_1.Subject(); // deprecated
          this.receiveICECandidate = new rxjs_1.Subject();
          this.connect = new rxjs_1.Subject();
          this.disconnect = new rxjs_1.Subject();
          this.reconnect = new rxjs_1.Subject();
          this.connectionError = new rxjs_1.Subject();
      }
      return SignalingDispatcher;
  }());
  exports.SignalingDispatcher = SignalingDispatcher;


/***/ },
/* 386 */,
/* 387 */,
/* 388 */
/***/ function(module, exports) {

  /**
   * Slice reference.
   */

  var slice = [].slice;

  /**
   * Bind `obj` to `fn`.
   *
   * @param {Object} obj
   * @param {Function|String} fn or string
   * @return {Function}
   * @api public
   */

  module.exports = function(obj, fn){
    if ('string' == typeof fn) fn = obj[fn];
    if ('function' != typeof fn) throw new Error('bind() requires a function');
    var args = slice.call(arguments, 2);
    return function(){
      return fn.apply(obj, args.concat(slice.call(arguments)));
    }
  };


/***/ },
/* 389 */,
/* 390 */,
/* 391 */,
/* 392 */,
/* 393 */,
/* 394 */,
/* 395 */,
/* 396 */,
/* 397 */,
/* 398 */,
/* 399 */,
/* 400 */,
/* 401 */,
/* 402 */,
/* 403 */,
/* 404 */,
/* 405 */,
/* 406 */,
/* 407 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * Module dependencies
   */

  var XMLHttpRequest = __webpack_require__(97);
  var XHR = __webpack_require__(482);
  var JSONP = __webpack_require__(481);
  var websocket = __webpack_require__(483);

  /**
   * Export transports.
   */

  exports.polling = polling;
  exports.websocket = websocket;

  /**
   * Polling transport polymorphic constructor.
   * Decides on xhr vs jsonp based on feature detection.
   *
   * @api private
   */

  function polling(opts){
    var xhr;
    var xd = false;
    var xs = false;
    var jsonp = false !== opts.jsonp;

    if (global.location) {
      var isSSL = 'https:' == location.protocol;
      var port = location.port;

      // some user agents have empty `location.port`
      if (!port) {
        port = isSSL ? 443 : 80;
      }

      xd = opts.hostname != location.hostname || port != opts.port;
      xs = opts.secure != isSSL;
    }

    opts.xdomain = xd;
    opts.xscheme = xs;
    xhr = new XMLHttpRequest(opts);

    if ('open' in xhr && !opts.forceJSONP) {
      return new XHR(opts);
    } else {
      if (!jsonp) throw new Error('JSONP disabled');
      return new JSONP(opts);
    }
  }

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 408 */
/***/ function(module, exports, __webpack_require__) {

  /**
   * Module dependencies.
   */

  var Transport = __webpack_require__(96);
  var parseqs = __webpack_require__(101);
  var parser = __webpack_require__(48);
  var inherit = __webpack_require__(79);
  var yeast = __webpack_require__(419);
  var debug = __webpack_require__(13)('engine.io-client:polling');

  /**
   * Module exports.
   */

  module.exports = Polling;

  /**
   * Is XHR2 supported?
   */

  var hasXHR2 = (function() {
    var XMLHttpRequest = __webpack_require__(97);
    var xhr = new XMLHttpRequest({ xdomain: false });
    return null != xhr.responseType;
  })();

  /**
   * Polling interface.
   *
   * @param {Object} opts
   * @api private
   */

  function Polling(opts){
    var forceBase64 = (opts && opts.forceBase64);
    if (!hasXHR2 || forceBase64) {
      this.supportsBinary = false;
    }
    Transport.call(this, opts);
  }

  /**
   * Inherits from Transport.
   */

  inherit(Polling, Transport);

  /**
   * Transport name.
   */

  Polling.prototype.name = 'polling';

  /**
   * Opens the socket (triggers polling). We write a PING message to determine
   * when the transport is open.
   *
   * @api private
   */

  Polling.prototype.doOpen = function(){
    this.poll();
  };

  /**
   * Pauses polling.
   *
   * @param {Function} callback upon buffers are flushed and transport is paused
   * @api private
   */

  Polling.prototype.pause = function(onPause){
    var pending = 0;
    var self = this;

    this.readyState = 'pausing';

    function pause(){
      debug('paused');
      self.readyState = 'paused';
      onPause();
    }

    if (this.polling || !this.writable) {
      var total = 0;

      if (this.polling) {
        debug('we are currently polling - waiting to pause');
        total++;
        this.once('pollComplete', function(){
          debug('pre-pause polling complete');
          --total || pause();
        });
      }

      if (!this.writable) {
        debug('we are currently writing - waiting to pause');
        total++;
        this.once('drain', function(){
          debug('pre-pause writing complete');
          --total || pause();
        });
      }
    } else {
      pause();
    }
  };

  /**
   * Starts polling cycle.
   *
   * @api public
   */

  Polling.prototype.poll = function(){
    debug('polling');
    this.polling = true;
    this.doPoll();
    this.emit('poll');
  };

  /**
   * Overloads onData to detect payloads.
   *
   * @api private
   */

  Polling.prototype.onData = function(data){
    var self = this;
    debug('polling got data %s', data);
    var callback = function(packet, index, total) {
      // if its the first message we consider the transport open
      if ('opening' == self.readyState) {
        self.onOpen();
      }

      // if its a close packet, we close the ongoing requests
      if ('close' == packet.type) {
        self.onClose();
        return false;
      }

      // otherwise bypass onData and handle the message
      self.onPacket(packet);
    };

    // decode payload
    parser.decodePayload(data, this.socket.binaryType, callback);

    // if an event did not trigger closing
    if ('closed' != this.readyState) {
      // if we got data we're not polling
      this.polling = false;
      this.emit('pollComplete');

      if ('open' == this.readyState) {
        this.poll();
      } else {
        debug('ignoring poll - transport state "%s"', this.readyState);
      }
    }
  };

  /**
   * For polling, send a close packet.
   *
   * @api private
   */

  Polling.prototype.doClose = function(){
    var self = this;

    function close(){
      debug('writing close packet');
      self.write([{ type: 'close' }]);
    }

    if ('open' == this.readyState) {
      debug('transport open - closing');
      close();
    } else {
      // in case we're trying to close while
      // handshaking is in progress (GH-164)
      debug('transport not open - deferring close');
      this.once('open', close);
    }
  };

  /**
   * Writes a packets payload.
   *
   * @param {Array} data packets
   * @param {Function} drain callback
   * @api private
   */

  Polling.prototype.write = function(packets){
    var self = this;
    this.writable = false;
    var callbackfn = function() {
      self.writable = true;
      self.emit('drain');
    };

    var self = this;
    parser.encodePayload(packets, this.supportsBinary, function(data) {
      self.doWrite(data, callbackfn);
    });
  };

  /**
   * Generates uri for connection.
   *
   * @api private
   */

  Polling.prototype.uri = function(){
    var query = this.query || {};
    var schema = this.secure ? 'https' : 'http';
    var port = '';

    // cache busting is forced
    if (false !== this.timestampRequests) {
      query[this.timestampParam] = yeast();
    }

    if (!this.supportsBinary && !query.sid) {
      query.b64 = 1;
    }

    query = parseqs.encode(query);

    // avoid port if default for schema
    if (this.port && (('https' == schema && this.port != 443) ||
       ('http' == schema && this.port != 80))) {
      port = ':' + this.port;
    }

    // prepend ? to query
    if (query.length) {
      query = '?' + query;
    }

    var ipv6 = this.hostname.indexOf(':') !== -1;
    return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
  };


/***/ },
/* 409 */,
/* 410 */
/***/ function(module, exports) {

  /**
   * Parses an URI
   *
   * @author Steven Levithan <stevenlevithan.com> (MIT license)
   * @api private
   */

  var re = /^(?:(?![^:@]+:[^:@\/]*@)(http|https|ws|wss):\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?((?:[a-f0-9]{0,4}:){2,7}[a-f0-9]{0,4}|[^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

  var parts = [
      'source', 'protocol', 'authority', 'userInfo', 'user', 'password', 'host', 'port', 'relative', 'path', 'directory', 'file', 'query', 'anchor'
  ];

  module.exports = function parseuri(str) {
      var src = str,
          b = str.indexOf('['),
          e = str.indexOf(']');

      if (b != -1 && e != -1) {
          str = str.substring(0, b) + str.substring(b, e).replace(/:/g, ';') + str.substring(e, str.length);
      }

      var m = re.exec(str || ''),
          uri = {},
          i = 14;

      while (i--) {
          uri[parts[i]] = m[i] || '';
      }

      if (b != -1 && e != -1) {
          uri.source = src;
          uri.host = uri.host.substring(1, uri.host.length - 1).replace(/;/g, ':');
          uri.authority = uri.authority.replace('[', '').replace(']', '').replace(/;/g, ':');
          uri.ipv6uri = true;
      }

      return uri;
  };


/***/ },
/* 411 */,
/* 412 */,
/* 413 */
/***/ function(module, exports, __webpack_require__) {

  
  /**
   * Module dependencies.
   */

  var eio = __webpack_require__(478);
  var Socket = __webpack_require__(415);
  var Emitter = __webpack_require__(88);
  var parser = __webpack_require__(380);
  var on = __webpack_require__(414);
  var bind = __webpack_require__(388);
  var debug = __webpack_require__(13)('socket.io-client:manager');
  var indexOf = __webpack_require__(84);
  var Backoff = __webpack_require__(428);

  /**
   * IE6+ hasOwnProperty
   */

  var has = Object.prototype.hasOwnProperty;

  /**
   * Module exports
   */

  module.exports = Manager;

  /**
   * `Manager` constructor.
   *
   * @param {String} engine instance or engine uri/opts
   * @param {Object} options
   * @api public
   */

  function Manager(uri, opts){
    if (!(this instanceof Manager)) return new Manager(uri, opts);
    if (uri && ('object' == typeof uri)) {
      opts = uri;
      uri = undefined;
    }
    opts = opts || {};

    opts.path = opts.path || '/socket.io';
    this.nsps = {};
    this.subs = [];
    this.opts = opts;
    this.reconnection(opts.reconnection !== false);
    this.reconnectionAttempts(opts.reconnectionAttempts || Infinity);
    this.reconnectionDelay(opts.reconnectionDelay || 1000);
    this.reconnectionDelayMax(opts.reconnectionDelayMax || 5000);
    this.randomizationFactor(opts.randomizationFactor || 0.5);
    this.backoff = new Backoff({
      min: this.reconnectionDelay(),
      max: this.reconnectionDelayMax(),
      jitter: this.randomizationFactor()
    });
    this.timeout(null == opts.timeout ? 20000 : opts.timeout);
    this.readyState = 'closed';
    this.uri = uri;
    this.connecting = [];
    this.lastPing = null;
    this.encoding = false;
    this.packetBuffer = [];
    this.encoder = new parser.Encoder();
    this.decoder = new parser.Decoder();
    this.autoConnect = opts.autoConnect !== false;
    if (this.autoConnect) this.open();
  }

  /**
   * Propagate given event to sockets and emit on `this`
   *
   * @api private
   */

  Manager.prototype.emitAll = function() {
    this.emit.apply(this, arguments);
    for (var nsp in this.nsps) {
      if (has.call(this.nsps, nsp)) {
        this.nsps[nsp].emit.apply(this.nsps[nsp], arguments);
      }
    }
  };

  /**
   * Update `socket.id` of all sockets
   *
   * @api private
   */

  Manager.prototype.updateSocketIds = function(){
    for (var nsp in this.nsps) {
      if (has.call(this.nsps, nsp)) {
        this.nsps[nsp].id = this.engine.id;
      }
    }
  };

  /**
   * Mix in `Emitter`.
   */

  Emitter(Manager.prototype);

  /**
   * Sets the `reconnection` config.
   *
   * @param {Boolean} true/false if it should automatically reconnect
   * @return {Manager} self or value
   * @api public
   */

  Manager.prototype.reconnection = function(v){
    if (!arguments.length) return this._reconnection;
    this._reconnection = !!v;
    return this;
  };

  /**
   * Sets the reconnection attempts config.
   *
   * @param {Number} max reconnection attempts before giving up
   * @return {Manager} self or value
   * @api public
   */

  Manager.prototype.reconnectionAttempts = function(v){
    if (!arguments.length) return this._reconnectionAttempts;
    this._reconnectionAttempts = v;
    return this;
  };

  /**
   * Sets the delay between reconnections.
   *
   * @param {Number} delay
   * @return {Manager} self or value
   * @api public
   */

  Manager.prototype.reconnectionDelay = function(v){
    if (!arguments.length) return this._reconnectionDelay;
    this._reconnectionDelay = v;
    this.backoff && this.backoff.setMin(v);
    return this;
  };

  Manager.prototype.randomizationFactor = function(v){
    if (!arguments.length) return this._randomizationFactor;
    this._randomizationFactor = v;
    this.backoff && this.backoff.setJitter(v);
    return this;
  };

  /**
   * Sets the maximum delay between reconnections.
   *
   * @param {Number} delay
   * @return {Manager} self or value
   * @api public
   */

  Manager.prototype.reconnectionDelayMax = function(v){
    if (!arguments.length) return this._reconnectionDelayMax;
    this._reconnectionDelayMax = v;
    this.backoff && this.backoff.setMax(v);
    return this;
  };

  /**
   * Sets the connection timeout. `false` to disable
   *
   * @return {Manager} self or value
   * @api public
   */

  Manager.prototype.timeout = function(v){
    if (!arguments.length) return this._timeout;
    this._timeout = v;
    return this;
  };

  /**
   * Starts trying to reconnect if reconnection is enabled and we have not
   * started reconnecting yet
   *
   * @api private
   */

  Manager.prototype.maybeReconnectOnOpen = function() {
    // Only try to reconnect if it's the first time we're connecting
    if (!this.reconnecting && this._reconnection && this.backoff.attempts === 0) {
      // keeps reconnection from firing twice for the same reconnection loop
      this.reconnect();
    }
  };


  /**
   * Sets the current transport `socket`.
   *
   * @param {Function} optional, callback
   * @return {Manager} self
   * @api public
   */

  Manager.prototype.open =
  Manager.prototype.connect = function(fn){
    debug('readyState %s', this.readyState);
    if (~this.readyState.indexOf('open')) return this;

    debug('opening %s', this.uri);
    this.engine = eio(this.uri, this.opts);
    var socket = this.engine;
    var self = this;
    this.readyState = 'opening';
    this.skipReconnect = false;

    // emit `open`
    var openSub = on(socket, 'open', function() {
      self.onopen();
      fn && fn();
    });

    // emit `connect_error`
    var errorSub = on(socket, 'error', function(data){
      debug('connect_error');
      self.cleanup();
      self.readyState = 'closed';
      self.emitAll('connect_error', data);
      if (fn) {
        var err = new Error('Connection error');
        err.data = data;
        fn(err);
      } else {
        // Only do this if there is no fn to handle the error
        self.maybeReconnectOnOpen();
      }
    });

    // emit `connect_timeout`
    if (false !== this._timeout) {
      var timeout = this._timeout;
      debug('connect attempt will timeout after %d', timeout);

      // set timer
      var timer = setTimeout(function(){
        debug('connect attempt timed out after %d', timeout);
        openSub.destroy();
        socket.close();
        socket.emit('error', 'timeout');
        self.emitAll('connect_timeout', timeout);
      }, timeout);

      this.subs.push({
        destroy: function(){
          clearTimeout(timer);
        }
      });
    }

    this.subs.push(openSub);
    this.subs.push(errorSub);

    return this;
  };

  /**
   * Called upon transport open.
   *
   * @api private
   */

  Manager.prototype.onopen = function(){
    debug('open');

    // clear old subs
    this.cleanup();

    // mark as open
    this.readyState = 'open';
    this.emit('open');

    // add new subs
    var socket = this.engine;
    this.subs.push(on(socket, 'data', bind(this, 'ondata')));
    this.subs.push(on(socket, 'ping', bind(this, 'onping')));
    this.subs.push(on(socket, 'pong', bind(this, 'onpong')));
    this.subs.push(on(socket, 'error', bind(this, 'onerror')));
    this.subs.push(on(socket, 'close', bind(this, 'onclose')));
    this.subs.push(on(this.decoder, 'decoded', bind(this, 'ondecoded')));
  };

  /**
   * Called upon a ping.
   *
   * @api private
   */

  Manager.prototype.onping = function(){
    this.lastPing = new Date;
    this.emitAll('ping');
  };

  /**
   * Called upon a packet.
   *
   * @api private
   */

  Manager.prototype.onpong = function(){
    this.emitAll('pong', new Date - this.lastPing);
  };

  /**
   * Called with data.
   *
   * @api private
   */

  Manager.prototype.ondata = function(data){
    this.decoder.add(data);
  };

  /**
   * Called when parser fully decodes a packet.
   *
   * @api private
   */

  Manager.prototype.ondecoded = function(packet) {
    this.emit('packet', packet);
  };

  /**
   * Called upon socket error.
   *
   * @api private
   */

  Manager.prototype.onerror = function(err){
    debug('error', err);
    this.emitAll('error', err);
  };

  /**
   * Creates a new socket for the given `nsp`.
   *
   * @return {Socket}
   * @api public
   */

  Manager.prototype.socket = function(nsp){
    var socket = this.nsps[nsp];
    if (!socket) {
      socket = new Socket(this, nsp);
      this.nsps[nsp] = socket;
      var self = this;
      socket.on('connecting', onConnecting);
      socket.on('connect', function(){
        socket.id = self.engine.id;
      });

      if (this.autoConnect) {
        // manually call here since connecting evnet is fired before listening
        onConnecting();
      }
    }

    function onConnecting() {
      if (!~indexOf(self.connecting, socket)) {
        self.connecting.push(socket);
      }
    }

    return socket;
  };

  /**
   * Called upon a socket close.
   *
   * @param {Socket} socket
   */

  Manager.prototype.destroy = function(socket){
    var index = indexOf(this.connecting, socket);
    if (~index) this.connecting.splice(index, 1);
    if (this.connecting.length) return;

    this.close();
  };

  /**
   * Writes a packet.
   *
   * @param {Object} packet
   * @api private
   */

  Manager.prototype.packet = function(packet){
    debug('writing packet %j', packet);
    var self = this;

    if (!self.encoding) {
      // encode, then write to engine with result
      self.encoding = true;
      this.encoder.encode(packet, function(encodedPackets) {
        for (var i = 0; i < encodedPackets.length; i++) {
          self.engine.write(encodedPackets[i], packet.options);
        }
        self.encoding = false;
        self.processPacketQueue();
      });
    } else { // add packet to the queue
      self.packetBuffer.push(packet);
    }
  };

  /**
   * If packet buffer is non-empty, begins encoding the
   * next packet in line.
   *
   * @api private
   */

  Manager.prototype.processPacketQueue = function() {
    if (this.packetBuffer.length > 0 && !this.encoding) {
      var pack = this.packetBuffer.shift();
      this.packet(pack);
    }
  };

  /**
   * Clean up transport subscriptions and packet buffer.
   *
   * @api private
   */

  Manager.prototype.cleanup = function(){
    debug('cleanup');

    var sub;
    while (sub = this.subs.shift()) sub.destroy();

    this.packetBuffer = [];
    this.encoding = false;
    this.lastPing = null;

    this.decoder.destroy();
  };

  /**
   * Close the current socket.
   *
   * @api private
   */

  Manager.prototype.close =
  Manager.prototype.disconnect = function(){
    debug('disconnect');
    this.skipReconnect = true;
    this.reconnecting = false;
    if ('opening' == this.readyState) {
      // `onclose` will not fire because
      // an open event never happened
      this.cleanup();
    }
    this.backoff.reset();
    this.readyState = 'closed';
    if (this.engine) this.engine.close();
  };

  /**
   * Called upon engine close.
   *
   * @api private
   */

  Manager.prototype.onclose = function(reason){
    debug('onclose');

    this.cleanup();
    this.backoff.reset();
    this.readyState = 'closed';
    this.emit('close', reason);

    if (this._reconnection && !this.skipReconnect) {
      this.reconnect();
    }
  };

  /**
   * Attempt a reconnection.
   *
   * @api private
   */

  Manager.prototype.reconnect = function(){
    if (this.reconnecting || this.skipReconnect) return this;

    var self = this;

    if (this.backoff.attempts >= this._reconnectionAttempts) {
      debug('reconnect failed');
      this.backoff.reset();
      this.emitAll('reconnect_failed');
      this.reconnecting = false;
    } else {
      var delay = this.backoff.duration();
      debug('will wait %dms before reconnect attempt', delay);

      this.reconnecting = true;
      var timer = setTimeout(function(){
        if (self.skipReconnect) return;

        debug('attempting reconnect');
        self.emitAll('reconnect_attempt', self.backoff.attempts);
        self.emitAll('reconnecting', self.backoff.attempts);

        // check again for the case socket closed in above events
        if (self.skipReconnect) return;

        self.open(function(err){
          if (err) {
            debug('reconnect attempt error');
            self.reconnecting = false;
            self.reconnect();
            self.emitAll('reconnect_error', err.data);
          } else {
            debug('reconnect success');
            self.onreconnect();
          }
        });
      }, delay);

      this.subs.push({
        destroy: function(){
          clearTimeout(timer);
        }
      });
    }
  };

  /**
   * Called upon successful reconnect.
   *
   * @api private
   */

  Manager.prototype.onreconnect = function(){
    var attempt = this.backoff.attempts;
    this.reconnecting = false;
    this.backoff.reset();
    this.updateSocketIds();
    this.emitAll('reconnect', attempt);
  };


/***/ },
/* 414 */
/***/ function(module, exports) {

  
  /**
   * Module exports.
   */

  module.exports = on;

  /**
   * Helper for subscriptions.
   *
   * @param {Object|EventEmitter} obj with `Emitter` mixin or `EventEmitter`
   * @param {String} event name
   * @param {Function} callback
   * @api public
   */

  function on(obj, ev, fn) {
    obj.on(ev, fn);
    return {
      destroy: function(){
        obj.removeListener(ev, fn);
      }
    };
  }


/***/ },
/* 415 */
/***/ function(module, exports, __webpack_require__) {

  
  /**
   * Module dependencies.
   */

  var parser = __webpack_require__(380);
  var Emitter = __webpack_require__(88);
  var toArray = __webpack_require__(521);
  var on = __webpack_require__(414);
  var bind = __webpack_require__(388);
  var debug = __webpack_require__(13)('socket.io-client:socket');
  var hasBin = __webpack_require__(492);

  /**
   * Module exports.
   */

  module.exports = exports = Socket;

  /**
   * Internal events (blacklisted).
   * These events can't be emitted by the user.
   *
   * @api private
   */

  var events = {
    connect: 1,
    connect_error: 1,
    connect_timeout: 1,
    connecting: 1,
    disconnect: 1,
    error: 1,
    reconnect: 1,
    reconnect_attempt: 1,
    reconnect_failed: 1,
    reconnect_error: 1,
    reconnecting: 1,
    ping: 1,
    pong: 1
  };

  /**
   * Shortcut to `Emitter#emit`.
   */

  var emit = Emitter.prototype.emit;

  /**
   * `Socket` constructor.
   *
   * @api public
   */

  function Socket(io, nsp){
    this.io = io;
    this.nsp = nsp;
    this.json = this; // compat
    this.ids = 0;
    this.acks = {};
    this.receiveBuffer = [];
    this.sendBuffer = [];
    this.connected = false;
    this.disconnected = true;
    if (this.io.autoConnect) this.open();
  }

  /**
   * Mix in `Emitter`.
   */

  Emitter(Socket.prototype);

  /**
   * Subscribe to open, close and packet events
   *
   * @api private
   */

  Socket.prototype.subEvents = function() {
    if (this.subs) return;

    var io = this.io;
    this.subs = [
      on(io, 'open', bind(this, 'onopen')),
      on(io, 'packet', bind(this, 'onpacket')),
      on(io, 'close', bind(this, 'onclose'))
    ];
  };

  /**
   * "Opens" the socket.
   *
   * @api public
   */

  Socket.prototype.open =
  Socket.prototype.connect = function(){
    if (this.connected) return this;

    this.subEvents();
    this.io.open(); // ensure open
    if ('open' == this.io.readyState) this.onopen();
    this.emit('connecting');
    return this;
  };

  /**
   * Sends a `message` event.
   *
   * @return {Socket} self
   * @api public
   */

  Socket.prototype.send = function(){
    var args = toArray(arguments);
    args.unshift('message');
    this.emit.apply(this, args);
    return this;
  };

  /**
   * Override `emit`.
   * If the event is in `events`, it's emitted normally.
   *
   * @param {String} event name
   * @return {Socket} self
   * @api public
   */

  Socket.prototype.emit = function(ev){
    if (events.hasOwnProperty(ev)) {
      emit.apply(this, arguments);
      return this;
    }

    var args = toArray(arguments);
    var parserType = parser.EVENT; // default
    if (hasBin(args)) { parserType = parser.BINARY_EVENT; } // binary
    var packet = { type: parserType, data: args };

    packet.options = {};
    packet.options.compress = !this.flags || false !== this.flags.compress;

    // event ack callback
    if ('function' == typeof args[args.length - 1]) {
      debug('emitting packet with ack id %d', this.ids);
      this.acks[this.ids] = args.pop();
      packet.id = this.ids++;
    }

    if (this.connected) {
      this.packet(packet);
    } else {
      this.sendBuffer.push(packet);
    }

    delete this.flags;

    return this;
  };

  /**
   * Sends a packet.
   *
   * @param {Object} packet
   * @api private
   */

  Socket.prototype.packet = function(packet){
    packet.nsp = this.nsp;
    this.io.packet(packet);
  };

  /**
   * Called upon engine `open`.
   *
   * @api private
   */

  Socket.prototype.onopen = function(){
    debug('transport is open - connecting');

    // write connect packet if necessary
    if ('/' != this.nsp) {
      this.packet({ type: parser.CONNECT });
    }
  };

  /**
   * Called upon engine `close`.
   *
   * @param {String} reason
   * @api private
   */

  Socket.prototype.onclose = function(reason){
    debug('close (%s)', reason);
    this.connected = false;
    this.disconnected = true;
    delete this.id;
    this.emit('disconnect', reason);
  };

  /**
   * Called with socket packet.
   *
   * @param {Object} packet
   * @api private
   */

  Socket.prototype.onpacket = function(packet){
    if (packet.nsp != this.nsp) return;

    switch (packet.type) {
      case parser.CONNECT:
        this.onconnect();
        break;

      case parser.EVENT:
        this.onevent(packet);
        break;

      case parser.BINARY_EVENT:
        this.onevent(packet);
        break;

      case parser.ACK:
        this.onack(packet);
        break;

      case parser.BINARY_ACK:
        this.onack(packet);
        break;

      case parser.DISCONNECT:
        this.ondisconnect();
        break;

      case parser.ERROR:
        this.emit('error', packet.data);
        break;
    }
  };

  /**
   * Called upon a server event.
   *
   * @param {Object} packet
   * @api private
   */

  Socket.prototype.onevent = function(packet){
    var args = packet.data || [];
    debug('emitting event %j', args);

    if (null != packet.id) {
      debug('attaching ack callback to event');
      args.push(this.ack(packet.id));
    }

    if (this.connected) {
      emit.apply(this, args);
    } else {
      this.receiveBuffer.push(args);
    }
  };

  /**
   * Produces an ack callback to emit with an event.
   *
   * @api private
   */

  Socket.prototype.ack = function(id){
    var self = this;
    var sent = false;
    return function(){
      // prevent double callbacks
      if (sent) return;
      sent = true;
      var args = toArray(arguments);
      debug('sending ack %j', args);

      var type = hasBin(args) ? parser.BINARY_ACK : parser.ACK;
      self.packet({
        type: type,
        id: id,
        data: args
      });
    };
  };

  /**
   * Called upon a server acknowlegement.
   *
   * @param {Object} packet
   * @api private
   */

  Socket.prototype.onack = function(packet){
    var ack = this.acks[packet.id];
    if ('function' == typeof ack) {
      debug('calling ack %s with %j', packet.id, packet.data);
      ack.apply(this, packet.data);
      delete this.acks[packet.id];
    } else {
      debug('bad ack %s', packet.id);
    }
  };

  /**
   * Called upon server connect.
   *
   * @api private
   */

  Socket.prototype.onconnect = function(){
    this.connected = true;
    this.disconnected = false;
    this.emit('connect');
    this.emitBuffered();
  };

  /**
   * Emit buffered events (received and emitted).
   *
   * @api private
   */

  Socket.prototype.emitBuffered = function(){
    var i;
    for (i = 0; i < this.receiveBuffer.length; i++) {
      emit.apply(this, this.receiveBuffer[i]);
    }
    this.receiveBuffer = [];

    for (i = 0; i < this.sendBuffer.length; i++) {
      this.packet(this.sendBuffer[i]);
    }
    this.sendBuffer = [];
  };

  /**
   * Called upon server disconnect.
   *
   * @api private
   */

  Socket.prototype.ondisconnect = function(){
    debug('server disconnect (%s)', this.nsp);
    this.destroy();
    this.onclose('io server disconnect');
  };

  /**
   * Called upon forced client/server side disconnections,
   * this method ensures the manager stops tracking us and
   * that reconnections don't get triggered for this.
   *
   * @api private.
   */

  Socket.prototype.destroy = function(){
    if (this.subs) {
      // clean subscriptions to avoid reconnections
      for (var i = 0; i < this.subs.length; i++) {
        this.subs[i].destroy();
      }
      this.subs = null;
    }

    this.io.destroy(this);
  };

  /**
   * Disconnects the socket manually.
   *
   * @return {Socket} self
   * @api public
   */

  Socket.prototype.close =
  Socket.prototype.disconnect = function(){
    if (this.connected) {
      debug('performing disconnect (%s)', this.nsp);
      this.packet({ type: parser.DISCONNECT });
    }

    // remove socket from pool
    this.destroy();

    if (this.connected) {
      // fire events
      this.onclose('io client disconnect');
    }
    return this;
  };

  /**
   * Sets the compress flag.
   *
   * @param {Boolean} if `true`, compresses the sending data
   * @return {Socket} self
   * @api public
   */

  Socket.prototype.compress = function(compress){
    this.flags = this.flags || {};
    this.flags.compress = compress;
    return this;
  };


/***/ },
/* 416 */
/***/ function(module, exports) {

  /* WEBPACK VAR INJECTION */(function(global) {
  module.exports = isBuf;

  /**
   * Returns true if obj is a buffer or an arraybuffer.
   *
   * @api private
   */

  function isBuf(obj) {
    return (global.Buffer && global.Buffer.isBuffer(obj)) ||
           (global.ArrayBuffer && obj instanceof ArrayBuffer);
  }

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 417 */,
/* 418 */
/***/ function(module, exports) {

  module.exports = function(module) {
    if(!module.webpackPolyfill) {
      module.deprecate = function() {};
      module.paths = [];
      // module.parent = undefined by default
      module.children = [];
      module.webpackPolyfill = 1;
    }
    return module;
  }


/***/ },
/* 419 */
/***/ function(module, exports) {

  'use strict';

  var alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_'.split('')
    , length = 64
    , map = {}
    , seed = 0
    , i = 0
    , prev;

  /**
   * Return a string representing the specified number.
   *
   * @param {Number} num The number to convert.
   * @returns {String} The string representation of the number.
   * @api public
   */
  function encode(num) {
    var encoded = '';

    do {
      encoded = alphabet[num % length] + encoded;
      num = Math.floor(num / length);
    } while (num > 0);

    return encoded;
  }

  /**
   * Return the integer value specified by the given string.
   *
   * @param {String} str The string to convert.
   * @returns {Number} The integer value represented by the string.
   * @api public
   */
  function decode(str) {
    var decoded = 0;

    for (i = 0; i < str.length; i++) {
      decoded = decoded * length + map[str.charAt(i)];
    }

    return decoded;
  }

  /**
   * Yeast: A tiny growing id generator.
   *
   * @returns {String} A unique id.
   * @api public
   */
  function yeast() {
    var now = encode(+new Date());

    if (now !== prev) return seed = 0, prev = now;
    return now +'.'+ encode(seed++);
  }

  //
  // Map each character to its index.
  //
  for (; i < length; i++) map[alphabet[i]] = i;

  //
  // Expose the `yeast`, `encode` and `decode` functions.
  //
  yeast.encode = encode;
  yeast.decode = decode;
  module.exports = yeast;


/***/ },
/* 420 */,
/* 421 */,
/* 422 */,
/* 423 */,
/* 424 */
/***/ function(module, exports) {

  module.exports = after

  function after(count, callback, err_cb) {
      var bail = false
      err_cb = err_cb || noop
      proxy.count = count

      return (count === 0) ? callback() : proxy

      function proxy(err, result) {
          if (proxy.count <= 0) {
              throw new Error('after called too many times')
          }
          --proxy.count

          // after first error, rest are passed to err_cb
          if (err) {
              bail = true
              callback(err)
              // future error callbacks will go to error handler
              callback = err_cb
          } else if (proxy.count === 0 && !bail) {
              callback(null, result)
          }
      }
  }

  function noop() {}


/***/ },
/* 425 */,
/* 426 */
/***/ function(module, exports) {

  /**
   * An abstraction for slicing an arraybuffer even when
   * ArrayBuffer.prototype.slice is not supported
   *
   * @api public
   */

  module.exports = function(arraybuffer, start, end) {
    var bytes = arraybuffer.byteLength;
    start = start || 0;
    end = end || bytes;

    if (arraybuffer.slice) { return arraybuffer.slice(start, end); }

    if (start < 0) { start += bytes; }
    if (end < 0) { end += bytes; }
    if (end > bytes) { end = bytes; }

    if (start >= bytes || start >= end || bytes === 0) {
      return new ArrayBuffer(0);
    }

    var abv = new Uint8Array(arraybuffer);
    var result = new Uint8Array(end - start);
    for (var i = start, ii = 0; i < end; i++, ii++) {
      result[ii] = abv[i];
    }
    return result.buffer;
  };


/***/ },
/* 427 */,
/* 428 */
/***/ function(module, exports) {

  
  /**
   * Expose `Backoff`.
   */

  module.exports = Backoff;

  /**
   * Initialize backoff timer with `opts`.
   *
   * - `min` initial timeout in milliseconds [100]
   * - `max` max timeout [10000]
   * - `jitter` [0]
   * - `factor` [2]
   *
   * @param {Object} opts
   * @api public
   */

  function Backoff(opts) {
    opts = opts || {};
    this.ms = opts.min || 100;
    this.max = opts.max || 10000;
    this.factor = opts.factor || 2;
    this.jitter = opts.jitter > 0 && opts.jitter <= 1 ? opts.jitter : 0;
    this.attempts = 0;
  }

  /**
   * Return the backoff duration.
   *
   * @return {Number}
   * @api public
   */

  Backoff.prototype.duration = function(){
    var ms = this.ms * Math.pow(this.factor, this.attempts++);
    if (this.jitter) {
      var rand =  Math.random();
      var deviation = Math.floor(rand * this.jitter * ms);
      ms = (Math.floor(rand * 10) & 1) == 0  ? ms - deviation : ms + deviation;
    }
    return Math.min(ms, this.max) | 0;
  };

  /**
   * Reset the number of attempts.
   *
   * @api public
   */

  Backoff.prototype.reset = function(){
    this.attempts = 0;
  };

  /**
   * Set the minimum duration
   *
   * @api public
   */

  Backoff.prototype.setMin = function(min){
    this.ms = min;
  };

  /**
   * Set the maximum duration
   *
   * @api public
   */

  Backoff.prototype.setMax = function(max){
    this.max = max;
  };

  /**
   * Set the jitter
   *
   * @api public
   */

  Backoff.prototype.setJitter = function(jitter){
    this.jitter = jitter;
  };



/***/ },
/* 429 */
/***/ function(module, exports) {

  /*
   * base64-arraybuffer
   * https://github.com/niklasvh/base64-arraybuffer
   *
   * Copyright (c) 2012 Niklas von Hertzen
   * Licensed under the MIT license.
   */
  (function(chars){
    "use strict";

    exports.encode = function(arraybuffer) {
      var bytes = new Uint8Array(arraybuffer),
      i, len = bytes.length, base64 = "";

      for (i = 0; i < len; i+=3) {
        base64 += chars[bytes[i] >> 2];
        base64 += chars[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
        base64 += chars[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
        base64 += chars[bytes[i + 2] & 63];
      }

      if ((len % 3) === 2) {
        base64 = base64.substring(0, base64.length - 1) + "=";
      } else if (len % 3 === 1) {
        base64 = base64.substring(0, base64.length - 2) + "==";
      }

      return base64;
    };

    exports.decode =  function(base64) {
      var bufferLength = base64.length * 0.75,
      len = base64.length, i, p = 0,
      encoded1, encoded2, encoded3, encoded4;

      if (base64[base64.length - 1] === "=") {
        bufferLength--;
        if (base64[base64.length - 2] === "=") {
          bufferLength--;
        }
      }

      var arraybuffer = new ArrayBuffer(bufferLength),
      bytes = new Uint8Array(arraybuffer);

      for (i = 0; i < len; i+=4) {
        encoded1 = chars.indexOf(base64[i]);
        encoded2 = chars.indexOf(base64[i+1]);
        encoded3 = chars.indexOf(base64[i+2]);
        encoded4 = chars.indexOf(base64[i+3]);

        bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
        bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
        bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
      }

      return arraybuffer;
    };
  })("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/");


/***/ },
/* 430 */,
/* 431 */
/***/ function(module, exports) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * Create a blob builder even when vendor prefixes exist
   */

  var BlobBuilder = global.BlobBuilder
    || global.WebKitBlobBuilder
    || global.MSBlobBuilder
    || global.MozBlobBuilder;

  /**
   * Check if Blob constructor is supported
   */

  var blobSupported = (function() {
    try {
      var a = new Blob(['hi']);
      return a.size === 2;
    } catch(e) {
      return false;
    }
  })();

  /**
   * Check if Blob constructor supports ArrayBufferViews
   * Fails in Safari 6, so we need to map to ArrayBuffers there.
   */

  var blobSupportsArrayBufferView = blobSupported && (function() {
    try {
      var b = new Blob([new Uint8Array([1,2])]);
      return b.size === 2;
    } catch(e) {
      return false;
    }
  })();

  /**
   * Check if BlobBuilder is supported
   */

  var blobBuilderSupported = BlobBuilder
    && BlobBuilder.prototype.append
    && BlobBuilder.prototype.getBlob;

  /**
   * Helper function that maps ArrayBufferViews to ArrayBuffers
   * Used by BlobBuilder constructor and old browsers that didn't
   * support it in the Blob constructor.
   */

  function mapArrayBufferViews(ary) {
    for (var i = 0; i < ary.length; i++) {
      var chunk = ary[i];
      if (chunk.buffer instanceof ArrayBuffer) {
        var buf = chunk.buffer;

        // if this is a subarray, make a copy so we only
        // include the subarray region from the underlying buffer
        if (chunk.byteLength !== buf.byteLength) {
          var copy = new Uint8Array(chunk.byteLength);
          copy.set(new Uint8Array(buf, chunk.byteOffset, chunk.byteLength));
          buf = copy.buffer;
        }

        ary[i] = buf;
      }
    }
  }

  function BlobBuilderConstructor(ary, options) {
    options = options || {};

    var bb = new BlobBuilder();
    mapArrayBufferViews(ary);

    for (var i = 0; i < ary.length; i++) {
      bb.append(ary[i]);
    }

    return (options.type) ? bb.getBlob(options.type) : bb.getBlob();
  };

  function BlobConstructor(ary, options) {
    mapArrayBufferViews(ary);
    return new Blob(ary, options || {});
  };

  module.exports = (function() {
    if (blobSupported) {
      return blobSupportsArrayBufferView ? global.Blob : BlobConstructor;
    } else if (blobBuilderSupported) {
      return BlobBuilderConstructor;
    } else {
      return undefined;
    }
  })();

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 432 */,
/* 433 */,
/* 434 */,
/* 435 */,
/* 436 */,
/* 437 */,
/* 438 */,
/* 439 */,
/* 440 */,
/* 441 */,
/* 442 */,
/* 443 */,
/* 444 */,
/* 445 */,
/* 446 */,
/* 447 */,
/* 448 */,
/* 449 */,
/* 450 */,
/* 451 */,
/* 452 */,
/* 453 */,
/* 454 */,
/* 455 */,
/* 456 */,
/* 457 */,
/* 458 */,
/* 459 */,
/* 460 */,
/* 461 */,
/* 462 */,
/* 463 */,
/* 464 */,
/* 465 */,
/* 466 */,
/* 467 */,
/* 468 */,
/* 469 */,
/* 470 */,
/* 471 */,
/* 472 */,
/* 473 */,
/* 474 */,
/* 475 */,
/* 476 */,
/* 477 */,
/* 478 */
/***/ function(module, exports, __webpack_require__) {

  
  module.exports =  __webpack_require__(479);


/***/ },
/* 479 */
/***/ function(module, exports, __webpack_require__) {

  
  module.exports = __webpack_require__(480);

  /**
   * Exports parser
   *
   * @api public
   *
   */
  module.exports.parser = __webpack_require__(48);


/***/ },
/* 480 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * Module dependencies.
   */

  var transports = __webpack_require__(407);
  var Emitter = __webpack_require__(98);
  var debug = __webpack_require__(13)('engine.io-client:socket');
  var index = __webpack_require__(84);
  var parser = __webpack_require__(48);
  var parseuri = __webpack_require__(410);
  var parsejson = __webpack_require__(498);
  var parseqs = __webpack_require__(101);

  /**
   * Module exports.
   */

  module.exports = Socket;

  /**
   * Noop function.
   *
   * @api private
   */

  function noop(){}

  /**
   * Socket constructor.
   *
   * @param {String|Object} uri or options
   * @param {Object} options
   * @api public
   */

  function Socket(uri, opts){
    if (!(this instanceof Socket)) return new Socket(uri, opts);

    opts = opts || {};

    if (uri && 'object' == typeof uri) {
      opts = uri;
      uri = null;
    }

    if (uri) {
      uri = parseuri(uri);
      opts.hostname = uri.host;
      opts.secure = uri.protocol == 'https' || uri.protocol == 'wss';
      opts.port = uri.port;
      if (uri.query) opts.query = uri.query;
    } else if (opts.host) {
      opts.hostname = parseuri(opts.host).host;
    }

    this.secure = null != opts.secure ? opts.secure :
      (global.location && 'https:' == location.protocol);

    if (opts.hostname && !opts.port) {
      // if no port is specified manually, use the protocol default
      opts.port = this.secure ? '443' : '80';
    }

    this.agent = opts.agent || false;
    this.hostname = opts.hostname ||
      (global.location ? location.hostname : 'localhost');
    this.port = opts.port || (global.location && location.port ?
         location.port :
         (this.secure ? 443 : 80));
    this.query = opts.query || {};
    if ('string' == typeof this.query) this.query = parseqs.decode(this.query);
    this.upgrade = false !== opts.upgrade;
    this.path = (opts.path || '/engine.io').replace(/\/$/, '') + '/';
    this.forceJSONP = !!opts.forceJSONP;
    this.jsonp = false !== opts.jsonp;
    this.forceBase64 = !!opts.forceBase64;
    this.enablesXDR = !!opts.enablesXDR;
    this.timestampParam = opts.timestampParam || 't';
    this.timestampRequests = opts.timestampRequests;
    this.transports = opts.transports || ['polling', 'websocket'];
    this.readyState = '';
    this.writeBuffer = [];
    this.policyPort = opts.policyPort || 843;
    this.rememberUpgrade = opts.rememberUpgrade || false;
    this.binaryType = null;
    this.onlyBinaryUpgrades = opts.onlyBinaryUpgrades;
    this.perMessageDeflate = false !== opts.perMessageDeflate ? (opts.perMessageDeflate || {}) : false;

    if (true === this.perMessageDeflate) this.perMessageDeflate = {};
    if (this.perMessageDeflate && null == this.perMessageDeflate.threshold) {
      this.perMessageDeflate.threshold = 1024;
    }

    // SSL options for Node.js client
    this.pfx = opts.pfx || null;
    this.key = opts.key || null;
    this.passphrase = opts.passphrase || null;
    this.cert = opts.cert || null;
    this.ca = opts.ca || null;
    this.ciphers = opts.ciphers || null;
    this.rejectUnauthorized = opts.rejectUnauthorized === undefined ? true : opts.rejectUnauthorized;

    // other options for Node.js client
    var freeGlobal = typeof global == 'object' && global;
    if (freeGlobal.global === freeGlobal) {
      if (opts.extraHeaders && Object.keys(opts.extraHeaders).length > 0) {
        this.extraHeaders = opts.extraHeaders;
      }
    }

    this.open();
  }

  Socket.priorWebsocketSuccess = false;

  /**
   * Mix in `Emitter`.
   */

  Emitter(Socket.prototype);

  /**
   * Protocol version.
   *
   * @api public
   */

  Socket.protocol = parser.protocol; // this is an int

  /**
   * Expose deps for legacy compatibility
   * and standalone browser access.
   */

  Socket.Socket = Socket;
  Socket.Transport = __webpack_require__(96);
  Socket.transports = __webpack_require__(407);
  Socket.parser = __webpack_require__(48);

  /**
   * Creates transport of the given type.
   *
   * @param {String} transport name
   * @return {Transport}
   * @api private
   */

  Socket.prototype.createTransport = function (name) {
    debug('creating transport "%s"', name);
    var query = clone(this.query);

    // append engine.io protocol identifier
    query.EIO = parser.protocol;

    // transport name
    query.transport = name;

    // session id if we already have one
    if (this.id) query.sid = this.id;

    var transport = new transports[name]({
      agent: this.agent,
      hostname: this.hostname,
      port: this.port,
      secure: this.secure,
      path: this.path,
      query: query,
      forceJSONP: this.forceJSONP,
      jsonp: this.jsonp,
      forceBase64: this.forceBase64,
      enablesXDR: this.enablesXDR,
      timestampRequests: this.timestampRequests,
      timestampParam: this.timestampParam,
      policyPort: this.policyPort,
      socket: this,
      pfx: this.pfx,
      key: this.key,
      passphrase: this.passphrase,
      cert: this.cert,
      ca: this.ca,
      ciphers: this.ciphers,
      rejectUnauthorized: this.rejectUnauthorized,
      perMessageDeflate: this.perMessageDeflate,
      extraHeaders: this.extraHeaders
    });

    return transport;
  };

  function clone (obj) {
    var o = {};
    for (var i in obj) {
      if (obj.hasOwnProperty(i)) {
        o[i] = obj[i];
      }
    }
    return o;
  }

  /**
   * Initializes transport to use and starts probe.
   *
   * @api private
   */
  Socket.prototype.open = function () {
    var transport;
    if (this.rememberUpgrade && Socket.priorWebsocketSuccess && this.transports.indexOf('websocket') != -1) {
      transport = 'websocket';
    } else if (0 === this.transports.length) {
      // Emit error on next tick so it can be listened to
      var self = this;
      setTimeout(function() {
        self.emit('error', 'No transports available');
      }, 0);
      return;
    } else {
      transport = this.transports[0];
    }
    this.readyState = 'opening';

    // Retry with the next transport if the transport is disabled (jsonp: false)
    try {
      transport = this.createTransport(transport);
    } catch (e) {
      this.transports.shift();
      this.open();
      return;
    }

    transport.open();
    this.setTransport(transport);
  };

  /**
   * Sets the current transport. Disables the existing one (if any).
   *
   * @api private
   */

  Socket.prototype.setTransport = function(transport){
    debug('setting transport %s', transport.name);
    var self = this;

    if (this.transport) {
      debug('clearing existing transport %s', this.transport.name);
      this.transport.removeAllListeners();
    }

    // set up transport
    this.transport = transport;

    // set up transport listeners
    transport
    .on('drain', function(){
      self.onDrain();
    })
    .on('packet', function(packet){
      self.onPacket(packet);
    })
    .on('error', function(e){
      self.onError(e);
    })
    .on('close', function(){
      self.onClose('transport close');
    });
  };

  /**
   * Probes a transport.
   *
   * @param {String} transport name
   * @api private
   */

  Socket.prototype.probe = function (name) {
    debug('probing transport "%s"', name);
    var transport = this.createTransport(name, { probe: 1 })
      , failed = false
      , self = this;

    Socket.priorWebsocketSuccess = false;

    function onTransportOpen(){
      if (self.onlyBinaryUpgrades) {
        var upgradeLosesBinary = !this.supportsBinary && self.transport.supportsBinary;
        failed = failed || upgradeLosesBinary;
      }
      if (failed) return;

      debug('probe transport "%s" opened', name);
      transport.send([{ type: 'ping', data: 'probe' }]);
      transport.once('packet', function (msg) {
        if (failed) return;
        if ('pong' == msg.type && 'probe' == msg.data) {
          debug('probe transport "%s" pong', name);
          self.upgrading = true;
          self.emit('upgrading', transport);
          if (!transport) return;
          Socket.priorWebsocketSuccess = 'websocket' == transport.name;

          debug('pausing current transport "%s"', self.transport.name);
          self.transport.pause(function () {
            if (failed) return;
            if ('closed' == self.readyState) return;
            debug('changing transport and sending upgrade packet');

            cleanup();

            self.setTransport(transport);
            transport.send([{ type: 'upgrade' }]);
            self.emit('upgrade', transport);
            transport = null;
            self.upgrading = false;
            self.flush();
          });
        } else {
          debug('probe transport "%s" failed', name);
          var err = new Error('probe error');
          err.transport = transport.name;
          self.emit('upgradeError', err);
        }
      });
    }

    function freezeTransport() {
      if (failed) return;

      // Any callback called by transport should be ignored since now
      failed = true;

      cleanup();

      transport.close();
      transport = null;
    }

    //Handle any error that happens while probing
    function onerror(err) {
      var error = new Error('probe error: ' + err);
      error.transport = transport.name;

      freezeTransport();

      debug('probe transport "%s" failed because of error: %s', name, err);

      self.emit('upgradeError', error);
    }

    function onTransportClose(){
      onerror("transport closed");
    }

    //When the socket is closed while we're probing
    function onclose(){
      onerror("socket closed");
    }

    //When the socket is upgraded while we're probing
    function onupgrade(to){
      if (transport && to.name != transport.name) {
        debug('"%s" works - aborting "%s"', to.name, transport.name);
        freezeTransport();
      }
    }

    //Remove all listeners on the transport and on self
    function cleanup(){
      transport.removeListener('open', onTransportOpen);
      transport.removeListener('error', onerror);
      transport.removeListener('close', onTransportClose);
      self.removeListener('close', onclose);
      self.removeListener('upgrading', onupgrade);
    }

    transport.once('open', onTransportOpen);
    transport.once('error', onerror);
    transport.once('close', onTransportClose);

    this.once('close', onclose);
    this.once('upgrading', onupgrade);

    transport.open();

  };

  /**
   * Called when connection is deemed open.
   *
   * @api public
   */

  Socket.prototype.onOpen = function () {
    debug('socket open');
    this.readyState = 'open';
    Socket.priorWebsocketSuccess = 'websocket' == this.transport.name;
    this.emit('open');
    this.flush();

    // we check for `readyState` in case an `open`
    // listener already closed the socket
    if ('open' == this.readyState && this.upgrade && this.transport.pause) {
      debug('starting upgrade probes');
      for (var i = 0, l = this.upgrades.length; i < l; i++) {
        this.probe(this.upgrades[i]);
      }
    }
  };

  /**
   * Handles a packet.
   *
   * @api private
   */

  Socket.prototype.onPacket = function (packet) {
    if ('opening' == this.readyState || 'open' == this.readyState) {
      debug('socket receive: type "%s", data "%s"', packet.type, packet.data);

      this.emit('packet', packet);

      // Socket is live - any packet counts
      this.emit('heartbeat');

      switch (packet.type) {
        case 'open':
          this.onHandshake(parsejson(packet.data));
          break;

        case 'pong':
          this.setPing();
          this.emit('pong');
          break;

        case 'error':
          var err = new Error('server error');
          err.code = packet.data;
          this.onError(err);
          break;

        case 'message':
          this.emit('data', packet.data);
          this.emit('message', packet.data);
          break;
      }
    } else {
      debug('packet received with socket readyState "%s"', this.readyState);
    }
  };

  /**
   * Called upon handshake completion.
   *
   * @param {Object} handshake obj
   * @api private
   */

  Socket.prototype.onHandshake = function (data) {
    this.emit('handshake', data);
    this.id = data.sid;
    this.transport.query.sid = data.sid;
    this.upgrades = this.filterUpgrades(data.upgrades);
    this.pingInterval = data.pingInterval;
    this.pingTimeout = data.pingTimeout;
    this.onOpen();
    // In case open handler closes socket
    if  ('closed' == this.readyState) return;
    this.setPing();

    // Prolong liveness of socket on heartbeat
    this.removeListener('heartbeat', this.onHeartbeat);
    this.on('heartbeat', this.onHeartbeat);
  };

  /**
   * Resets ping timeout.
   *
   * @api private
   */

  Socket.prototype.onHeartbeat = function (timeout) {
    clearTimeout(this.pingTimeoutTimer);
    var self = this;
    self.pingTimeoutTimer = setTimeout(function () {
      if ('closed' == self.readyState) return;
      self.onClose('ping timeout');
    }, timeout || (self.pingInterval + self.pingTimeout));
  };

  /**
   * Pings server every `this.pingInterval` and expects response
   * within `this.pingTimeout` or closes connection.
   *
   * @api private
   */

  Socket.prototype.setPing = function () {
    var self = this;
    clearTimeout(self.pingIntervalTimer);
    self.pingIntervalTimer = setTimeout(function () {
      debug('writing ping packet - expecting pong within %sms', self.pingTimeout);
      self.ping();
      self.onHeartbeat(self.pingTimeout);
    }, self.pingInterval);
  };

  /**
  * Sends a ping packet.
  *
  * @api private
  */

  Socket.prototype.ping = function () {
    var self = this;
    this.sendPacket('ping', function(){
      self.emit('ping');
    });
  };

  /**
   * Called on `drain` event
   *
   * @api private
   */

  Socket.prototype.onDrain = function() {
    this.writeBuffer.splice(0, this.prevBufferLen);

    // setting prevBufferLen = 0 is very important
    // for example, when upgrading, upgrade packet is sent over,
    // and a nonzero prevBufferLen could cause problems on `drain`
    this.prevBufferLen = 0;

    if (0 === this.writeBuffer.length) {
      this.emit('drain');
    } else {
      this.flush();
    }
  };

  /**
   * Flush write buffers.
   *
   * @api private
   */

  Socket.prototype.flush = function () {
    if ('closed' != this.readyState && this.transport.writable &&
      !this.upgrading && this.writeBuffer.length) {
      debug('flushing %d packets in socket', this.writeBuffer.length);
      this.transport.send(this.writeBuffer);
      // keep track of current length of writeBuffer
      // splice writeBuffer and callbackBuffer on `drain`
      this.prevBufferLen = this.writeBuffer.length;
      this.emit('flush');
    }
  };

  /**
   * Sends a message.
   *
   * @param {String} message.
   * @param {Function} callback function.
   * @param {Object} options.
   * @return {Socket} for chaining.
   * @api public
   */

  Socket.prototype.write =
  Socket.prototype.send = function (msg, options, fn) {
    this.sendPacket('message', msg, options, fn);
    return this;
  };

  /**
   * Sends a packet.
   *
   * @param {String} packet type.
   * @param {String} data.
   * @param {Object} options.
   * @param {Function} callback function.
   * @api private
   */

  Socket.prototype.sendPacket = function (type, data, options, fn) {
    if('function' == typeof data) {
      fn = data;
      data = undefined;
    }

    if ('function' == typeof options) {
      fn = options;
      options = null;
    }

    if ('closing' == this.readyState || 'closed' == this.readyState) {
      return;
    }

    options = options || {};
    options.compress = false !== options.compress;

    var packet = {
      type: type,
      data: data,
      options: options
    };
    this.emit('packetCreate', packet);
    this.writeBuffer.push(packet);
    if (fn) this.once('flush', fn);
    this.flush();
  };

  /**
   * Closes the connection.
   *
   * @api private
   */

  Socket.prototype.close = function () {
    if ('opening' == this.readyState || 'open' == this.readyState) {
      this.readyState = 'closing';

      var self = this;

      if (this.writeBuffer.length) {
        this.once('drain', function() {
          if (this.upgrading) {
            waitForUpgrade();
          } else {
            close();
          }
        });
      } else if (this.upgrading) {
        waitForUpgrade();
      } else {
        close();
      }
    }

    function close() {
      self.onClose('forced close');
      debug('socket closing - telling transport to close');
      self.transport.close();
    }

    function cleanupAndClose() {
      self.removeListener('upgrade', cleanupAndClose);
      self.removeListener('upgradeError', cleanupAndClose);
      close();
    }

    function waitForUpgrade() {
      // wait for upgrade to finish since we can't send packets while pausing a transport
      self.once('upgrade', cleanupAndClose);
      self.once('upgradeError', cleanupAndClose);
    }

    return this;
  };

  /**
   * Called upon transport error
   *
   * @api private
   */

  Socket.prototype.onError = function (err) {
    debug('socket error %j', err);
    Socket.priorWebsocketSuccess = false;
    this.emit('error', err);
    this.onClose('transport error', err);
  };

  /**
   * Called upon transport close.
   *
   * @api private
   */

  Socket.prototype.onClose = function (reason, desc) {
    if ('opening' == this.readyState || 'open' == this.readyState || 'closing' == this.readyState) {
      debug('socket close with reason: "%s"', reason);
      var self = this;

      // clear timers
      clearTimeout(this.pingIntervalTimer);
      clearTimeout(this.pingTimeoutTimer);

      // stop event from firing again for transport
      this.transport.removeAllListeners('close');

      // ensure transport won't stay open
      this.transport.close();

      // ignore further transport communication
      this.transport.removeAllListeners();

      // set ready state
      this.readyState = 'closed';

      // clear session id
      this.id = null;

      // emit close event
      this.emit('close', reason, desc);

      // clean buffers after, so users can still
      // grab the buffers on `close` event
      self.writeBuffer = [];
      self.prevBufferLen = 0;
    }
  };

  /**
   * Filters upgrades, returning only those matching client transports.
   *
   * @param {Array} server upgrades
   * @api private
   *
   */

  Socket.prototype.filterUpgrades = function (upgrades) {
    var filteredUpgrades = [];
    for (var i = 0, j = upgrades.length; i<j; i++) {
      if (~index(this.transports, upgrades[i])) filteredUpgrades.push(upgrades[i]);
    }
    return filteredUpgrades;
  };

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 481 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {
  /**
   * Module requirements.
   */

  var Polling = __webpack_require__(408);
  var inherit = __webpack_require__(79);

  /**
   * Module exports.
   */

  module.exports = JSONPPolling;

  /**
   * Cached regular expressions.
   */

  var rNewline = /\n/g;
  var rEscapedNewline = /\\n/g;

  /**
   * Global JSONP callbacks.
   */

  var callbacks;

  /**
   * Callbacks count.
   */

  var index = 0;

  /**
   * Noop.
   */

  function empty () { }

  /**
   * JSONP Polling constructor.
   *
   * @param {Object} opts.
   * @api public
   */

  function JSONPPolling (opts) {
    Polling.call(this, opts);

    this.query = this.query || {};

    // define global callbacks array if not present
    // we do this here (lazily) to avoid unneeded global pollution
    if (!callbacks) {
      // we need to consider multiple engines in the same page
      if (!global.___eio) global.___eio = [];
      callbacks = global.___eio;
    }

    // callback identifier
    this.index = callbacks.length;

    // add callback to jsonp global
    var self = this;
    callbacks.push(function (msg) {
      self.onData(msg);
    });

    // append to query string
    this.query.j = this.index;

    // prevent spurious errors from being emitted when the window is unloaded
    if (global.document && global.addEventListener) {
      global.addEventListener('beforeunload', function () {
        if (self.script) self.script.onerror = empty;
      }, false);
    }
  }

  /**
   * Inherits from Polling.
   */

  inherit(JSONPPolling, Polling);

  /*
   * JSONP only supports binary as base64 encoded strings
   */

  JSONPPolling.prototype.supportsBinary = false;

  /**
   * Closes the socket.
   *
   * @api private
   */

  JSONPPolling.prototype.doClose = function () {
    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    if (this.form) {
      this.form.parentNode.removeChild(this.form);
      this.form = null;
      this.iframe = null;
    }

    Polling.prototype.doClose.call(this);
  };

  /**
   * Starts a poll cycle.
   *
   * @api private
   */

  JSONPPolling.prototype.doPoll = function () {
    var self = this;
    var script = document.createElement('script');

    if (this.script) {
      this.script.parentNode.removeChild(this.script);
      this.script = null;
    }

    script.async = true;
    script.src = this.uri();
    script.onerror = function(e){
      self.onError('jsonp poll error',e);
    };

    var insertAt = document.getElementsByTagName('script')[0];
    if (insertAt) {
      insertAt.parentNode.insertBefore(script, insertAt);
    }
    else {
      (document.head || document.body).appendChild(script);
    }
    this.script = script;

    var isUAgecko = 'undefined' != typeof navigator && /gecko/i.test(navigator.userAgent);
    
    if (isUAgecko) {
      setTimeout(function () {
        var iframe = document.createElement('iframe');
        document.body.appendChild(iframe);
        document.body.removeChild(iframe);
      }, 100);
    }
  };

  /**
   * Writes with a hidden iframe.
   *
   * @param {String} data to send
   * @param {Function} called upon flush.
   * @api private
   */

  JSONPPolling.prototype.doWrite = function (data, fn) {
    var self = this;

    if (!this.form) {
      var form = document.createElement('form');
      var area = document.createElement('textarea');
      var id = this.iframeId = 'eio_iframe_' + this.index;
      var iframe;

      form.className = 'socketio';
      form.style.position = 'absolute';
      form.style.top = '-1000px';
      form.style.left = '-1000px';
      form.target = id;
      form.method = 'POST';
      form.setAttribute('accept-charset', 'utf-8');
      area.name = 'd';
      form.appendChild(area);
      document.body.appendChild(form);

      this.form = form;
      this.area = area;
    }

    this.form.action = this.uri();

    function complete () {
      initIframe();
      fn();
    }

    function initIframe () {
      if (self.iframe) {
        try {
          self.form.removeChild(self.iframe);
        } catch (e) {
          self.onError('jsonp polling iframe removal error', e);
        }
      }

      try {
        // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
        var html = '<iframe src="javascript:0" name="'+ self.iframeId +'">';
        iframe = document.createElement(html);
      } catch (e) {
        iframe = document.createElement('iframe');
        iframe.name = self.iframeId;
        iframe.src = 'javascript:0';
      }

      iframe.id = self.iframeId;

      self.form.appendChild(iframe);
      self.iframe = iframe;
    }

    initIframe();

    // escape \n to prevent it from being converted into \r\n by some UAs
    // double escaping is required for escaped new lines because unescaping of new lines can be done safely on server-side
    data = data.replace(rEscapedNewline, '\\\n');
    this.area.value = data.replace(rNewline, '\\n');

    try {
      this.form.submit();
    } catch(e) {}

    if (this.iframe.attachEvent) {
      this.iframe.onreadystatechange = function(){
        if (self.iframe.readyState == 'complete') {
          complete();
        }
      };
    } else {
      this.iframe.onload = complete;
    }
  };

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 482 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * Module requirements.
   */

  var XMLHttpRequest = __webpack_require__(97);
  var Polling = __webpack_require__(408);
  var Emitter = __webpack_require__(98);
  var inherit = __webpack_require__(79);
  var debug = __webpack_require__(13)('engine.io-client:polling-xhr');

  /**
   * Module exports.
   */

  module.exports = XHR;
  module.exports.Request = Request;

  /**
   * Empty function
   */

  function empty(){}

  /**
   * XHR Polling constructor.
   *
   * @param {Object} opts
   * @api public
   */

  function XHR(opts){
    Polling.call(this, opts);

    if (global.location) {
      var isSSL = 'https:' == location.protocol;
      var port = location.port;

      // some user agents have empty `location.port`
      if (!port) {
        port = isSSL ? 443 : 80;
      }

      this.xd = opts.hostname != global.location.hostname ||
        port != opts.port;
      this.xs = opts.secure != isSSL;
    } else {
      this.extraHeaders = opts.extraHeaders;
    }
  }

  /**
   * Inherits from Polling.
   */

  inherit(XHR, Polling);

  /**
   * XHR supports binary
   */

  XHR.prototype.supportsBinary = true;

  /**
   * Creates a request.
   *
   * @param {String} method
   * @api private
   */

  XHR.prototype.request = function(opts){
    opts = opts || {};
    opts.uri = this.uri();
    opts.xd = this.xd;
    opts.xs = this.xs;
    opts.agent = this.agent || false;
    opts.supportsBinary = this.supportsBinary;
    opts.enablesXDR = this.enablesXDR;

    // SSL options for Node.js client
    opts.pfx = this.pfx;
    opts.key = this.key;
    opts.passphrase = this.passphrase;
    opts.cert = this.cert;
    opts.ca = this.ca;
    opts.ciphers = this.ciphers;
    opts.rejectUnauthorized = this.rejectUnauthorized;

    // other options for Node.js client
    opts.extraHeaders = this.extraHeaders;

    return new Request(opts);
  };

  /**
   * Sends data.
   *
   * @param {String} data to send.
   * @param {Function} called upon flush.
   * @api private
   */

  XHR.prototype.doWrite = function(data, fn){
    var isBinary = typeof data !== 'string' && data !== undefined;
    var req = this.request({ method: 'POST', data: data, isBinary: isBinary });
    var self = this;
    req.on('success', fn);
    req.on('error', function(err){
      self.onError('xhr post error', err);
    });
    this.sendXhr = req;
  };

  /**
   * Starts a poll cycle.
   *
   * @api private
   */

  XHR.prototype.doPoll = function(){
    debug('xhr poll');
    var req = this.request();
    var self = this;
    req.on('data', function(data){
      self.onData(data);
    });
    req.on('error', function(err){
      self.onError('xhr poll error', err);
    });
    this.pollXhr = req;
  };

  /**
   * Request constructor
   *
   * @param {Object} options
   * @api public
   */

  function Request(opts){
    this.method = opts.method || 'GET';
    this.uri = opts.uri;
    this.xd = !!opts.xd;
    this.xs = !!opts.xs;
    this.async = false !== opts.async;
    this.data = undefined != opts.data ? opts.data : null;
    this.agent = opts.agent;
    this.isBinary = opts.isBinary;
    this.supportsBinary = opts.supportsBinary;
    this.enablesXDR = opts.enablesXDR;

    // SSL options for Node.js client
    this.pfx = opts.pfx;
    this.key = opts.key;
    this.passphrase = opts.passphrase;
    this.cert = opts.cert;
    this.ca = opts.ca;
    this.ciphers = opts.ciphers;
    this.rejectUnauthorized = opts.rejectUnauthorized;

    // other options for Node.js client
    this.extraHeaders = opts.extraHeaders;

    this.create();
  }

  /**
   * Mix in `Emitter`.
   */

  Emitter(Request.prototype);

  /**
   * Creates the XHR object and sends the request.
   *
   * @api private
   */

  Request.prototype.create = function(){
    var opts = { agent: this.agent, xdomain: this.xd, xscheme: this.xs, enablesXDR: this.enablesXDR };

    // SSL options for Node.js client
    opts.pfx = this.pfx;
    opts.key = this.key;
    opts.passphrase = this.passphrase;
    opts.cert = this.cert;
    opts.ca = this.ca;
    opts.ciphers = this.ciphers;
    opts.rejectUnauthorized = this.rejectUnauthorized;

    var xhr = this.xhr = new XMLHttpRequest(opts);
    var self = this;

    try {
      debug('xhr open %s: %s', this.method, this.uri);
      xhr.open(this.method, this.uri, this.async);
      try {
        if (this.extraHeaders) {
          xhr.setDisableHeaderCheck(true);
          for (var i in this.extraHeaders) {
            if (this.extraHeaders.hasOwnProperty(i)) {
              xhr.setRequestHeader(i, this.extraHeaders[i]);
            }
          }
        }
      } catch (e) {}
      if (this.supportsBinary) {
        // This has to be done after open because Firefox is stupid
        // http://stackoverflow.com/questions/13216903/get-binary-data-with-xmlhttprequest-in-a-firefox-extension
        xhr.responseType = 'arraybuffer';
      }

      if ('POST' == this.method) {
        try {
          if (this.isBinary) {
            xhr.setRequestHeader('Content-type', 'application/octet-stream');
          } else {
            xhr.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
          }
        } catch (e) {}
      }

      // ie6 check
      if ('withCredentials' in xhr) {
        xhr.withCredentials = true;
      }

      if (this.hasXDR()) {
        xhr.onload = function(){
          self.onLoad();
        };
        xhr.onerror = function(){
          self.onError(xhr.responseText);
        };
      } else {
        xhr.onreadystatechange = function(){
          if (4 != xhr.readyState) return;
          if (200 == xhr.status || 1223 == xhr.status) {
            self.onLoad();
          } else {
            // make sure the `error` event handler that's user-set
            // does not throw in the same tick and gets caught here
            setTimeout(function(){
              self.onError(xhr.status);
            }, 0);
          }
        };
      }

      debug('xhr data %s', this.data);
      xhr.send(this.data);
    } catch (e) {
      // Need to defer since .create() is called directly fhrom the constructor
      // and thus the 'error' event can only be only bound *after* this exception
      // occurs.  Therefore, also, we cannot throw here at all.
      setTimeout(function() {
        self.onError(e);
      }, 0);
      return;
    }

    if (global.document) {
      this.index = Request.requestsCount++;
      Request.requests[this.index] = this;
    }
  };

  /**
   * Called upon successful response.
   *
   * @api private
   */

  Request.prototype.onSuccess = function(){
    this.emit('success');
    this.cleanup();
  };

  /**
   * Called if we have data.
   *
   * @api private
   */

  Request.prototype.onData = function(data){
    this.emit('data', data);
    this.onSuccess();
  };

  /**
   * Called upon error.
   *
   * @api private
   */

  Request.prototype.onError = function(err){
    this.emit('error', err);
    this.cleanup(true);
  };

  /**
   * Cleans up house.
   *
   * @api private
   */

  Request.prototype.cleanup = function(fromError){
    if ('undefined' == typeof this.xhr || null === this.xhr) {
      return;
    }
    // xmlhttprequest
    if (this.hasXDR()) {
      this.xhr.onload = this.xhr.onerror = empty;
    } else {
      this.xhr.onreadystatechange = empty;
    }

    if (fromError) {
      try {
        this.xhr.abort();
      } catch(e) {}
    }

    if (global.document) {
      delete Request.requests[this.index];
    }

    this.xhr = null;
  };

  /**
   * Called upon load.
   *
   * @api private
   */

  Request.prototype.onLoad = function(){
    var data;
    try {
      var contentType;
      try {
        contentType = this.xhr.getResponseHeader('Content-Type').split(';')[0];
      } catch (e) {}
      if (contentType === 'application/octet-stream') {
        data = this.xhr.response;
      } else {
        if (!this.supportsBinary) {
          data = this.xhr.responseText;
        } else {
          try {
            data = String.fromCharCode.apply(null, new Uint8Array(this.xhr.response));
          } catch (e) {
            var ui8Arr = new Uint8Array(this.xhr.response);
            var dataArray = [];
            for (var idx = 0, length = ui8Arr.length; idx < length; idx++) {
              dataArray.push(ui8Arr[idx]);
            }

            data = String.fromCharCode.apply(null, dataArray);
          }
        }
      }
    } catch (e) {
      this.onError(e);
    }
    if (null != data) {
      this.onData(data);
    }
  };

  /**
   * Check if it has XDomainRequest.
   *
   * @api private
   */

  Request.prototype.hasXDR = function(){
    return 'undefined' !== typeof global.XDomainRequest && !this.xs && this.enablesXDR;
  };

  /**
   * Aborts the request.
   *
   * @api public
   */

  Request.prototype.abort = function(){
    this.cleanup();
  };

  /**
   * Aborts pending requests when unloading the window. This is needed to prevent
   * memory leaks (e.g. when using IE) and to ensure that no spurious error is
   * emitted.
   */

  if (global.document) {
    Request.requestsCount = 0;
    Request.requests = {};
    if (global.attachEvent) {
      global.attachEvent('onunload', unloadHandler);
    } else if (global.addEventListener) {
      global.addEventListener('beforeunload', unloadHandler, false);
    }
  }

  function unloadHandler() {
    for (var i in Request.requests) {
      if (Request.requests.hasOwnProperty(i)) {
        Request.requests[i].abort();
      }
    }
  }

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 483 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * Module dependencies.
   */

  var Transport = __webpack_require__(96);
  var parser = __webpack_require__(48);
  var parseqs = __webpack_require__(101);
  var inherit = __webpack_require__(79);
  var yeast = __webpack_require__(419);
  var debug = __webpack_require__(13)('engine.io-client:websocket');
  var BrowserWebSocket = global.WebSocket || global.MozWebSocket;

  /**
   * Get either the `WebSocket` or `MozWebSocket` globals
   * in the browser or try to resolve WebSocket-compatible
   * interface exposed by `ws` for Node-like environment.
   */

  var WebSocket = BrowserWebSocket;
  if (!WebSocket && typeof window === 'undefined') {
    try {
      WebSocket = __webpack_require__(539);
    } catch (e) { }
  }

  /**
   * Module exports.
   */

  module.exports = WS;

  /**
   * WebSocket transport constructor.
   *
   * @api {Object} connection options
   * @api public
   */

  function WS(opts){
    var forceBase64 = (opts && opts.forceBase64);
    if (forceBase64) {
      this.supportsBinary = false;
    }
    this.perMessageDeflate = opts.perMessageDeflate;
    Transport.call(this, opts);
  }

  /**
   * Inherits from Transport.
   */

  inherit(WS, Transport);

  /**
   * Transport name.
   *
   * @api public
   */

  WS.prototype.name = 'websocket';

  /*
   * WebSockets support binary
   */

  WS.prototype.supportsBinary = true;

  /**
   * Opens socket.
   *
   * @api private
   */

  WS.prototype.doOpen = function(){
    if (!this.check()) {
      // let probe timeout
      return;
    }

    var self = this;
    var uri = this.uri();
    var protocols = void(0);
    var opts = {
      agent: this.agent,
      perMessageDeflate: this.perMessageDeflate
    };

    // SSL options for Node.js client
    opts.pfx = this.pfx;
    opts.key = this.key;
    opts.passphrase = this.passphrase;
    opts.cert = this.cert;
    opts.ca = this.ca;
    opts.ciphers = this.ciphers;
    opts.rejectUnauthorized = this.rejectUnauthorized;
    if (this.extraHeaders) {
      opts.headers = this.extraHeaders;
    }

    this.ws = BrowserWebSocket ? new WebSocket(uri) : new WebSocket(uri, protocols, opts);

    if (this.ws.binaryType === undefined) {
      this.supportsBinary = false;
    }

    if (this.ws.supports && this.ws.supports.binary) {
      this.supportsBinary = true;
      this.ws.binaryType = 'buffer';
    } else {
      this.ws.binaryType = 'arraybuffer';
    }

    this.addEventListeners();
  };

  /**
   * Adds event listeners to the socket
   *
   * @api private
   */

  WS.prototype.addEventListeners = function(){
    var self = this;

    this.ws.onopen = function(){
      self.onOpen();
    };
    this.ws.onclose = function(){
      self.onClose();
    };
    this.ws.onmessage = function(ev){
      self.onData(ev.data);
    };
    this.ws.onerror = function(e){
      self.onError('websocket error', e);
    };
  };

  /**
   * Override `onData` to use a timer on iOS.
   * See: https://gist.github.com/mloughran/2052006
   *
   * @api private
   */

  if ('undefined' != typeof navigator
    && /iPad|iPhone|iPod/i.test(navigator.userAgent)) {
    WS.prototype.onData = function(data){
      var self = this;
      setTimeout(function(){
        Transport.prototype.onData.call(self, data);
      }, 0);
    };
  }

  /**
   * Writes data to socket.
   *
   * @param {Array} array of packets.
   * @api private
   */

  WS.prototype.write = function(packets){
    var self = this;
    this.writable = false;

    // encodePacket efficient as it uses WS framing
    // no need for encodePayload
    var total = packets.length;
    for (var i = 0, l = total; i < l; i++) {
      (function(packet) {
        parser.encodePacket(packet, self.supportsBinary, function(data) {
          if (!BrowserWebSocket) {
            // always create a new object (GH-437)
            var opts = {};
            if (packet.options) {
              opts.compress = packet.options.compress;
            }

            if (self.perMessageDeflate) {
              var len = 'string' == typeof data ? global.Buffer.byteLength(data) : data.length;
              if (len < self.perMessageDeflate.threshold) {
                opts.compress = false;
              }
            }
          }

          //Sometimes the websocket has already been closed but the browser didn't
          //have a chance of informing us about it yet, in that case send will
          //throw an error
          try {
            if (BrowserWebSocket) {
              // TypeError is thrown when passing the second argument on Safari
              self.ws.send(data);
            } else {
              self.ws.send(data, opts);
            }
          } catch (e){
            debug('websocket closed before onclose event');
          }

          --total || done();
        });
      })(packets[i]);
    }

    function done(){
      self.emit('flush');

      // fake drain
      // defer to next tick to allow Socket to clear writeBuffer
      setTimeout(function(){
        self.writable = true;
        self.emit('drain');
      }, 0);
    }
  };

  /**
   * Called upon close
   *
   * @api private
   */

  WS.prototype.onClose = function(){
    Transport.prototype.onClose.call(this);
  };

  /**
   * Closes socket.
   *
   * @api private
   */

  WS.prototype.doClose = function(){
    if (typeof this.ws !== 'undefined') {
      this.ws.close();
    }
  };

  /**
   * Generates uri for connection.
   *
   * @api private
   */

  WS.prototype.uri = function(){
    var query = this.query || {};
    var schema = this.secure ? 'wss' : 'ws';
    var port = '';

    // avoid port if default for schema
    if (this.port && (('wss' == schema && this.port != 443)
      || ('ws' == schema && this.port != 80))) {
      port = ':' + this.port;
    }

    // append timestamp to URI
    if (this.timestampRequests) {
      query[this.timestampParam] = yeast();
    }

    // communicate binary support capabilities
    if (!this.supportsBinary) {
      query.b64 = 1;
    }

    query = parseqs.encode(query);

    // prepend ? to query
    if (query.length) {
      query = '?' + query;
    }

    var ipv6 = this.hostname.indexOf(':') !== -1;
    return schema + '://' + (ipv6 ? '[' + this.hostname + ']' : this.hostname) + port + this.path + query;
  };

  /**
   * Feature detection for WebSocket.
   *
   * @return {Boolean} whether this transport is available.
   * @api public
   */

  WS.prototype.check = function(){
    return !!WebSocket && !('__initialize' in WebSocket && this.name === WS.prototype.name);
  };

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 484 */
/***/ function(module, exports) {

  
  /**
   * Gets the keys for an object.
   *
   * @return {Array} keys
   * @api private
   */

  module.exports = Object.keys || function keys (obj){
    var arr = [];
    var has = Object.prototype.hasOwnProperty;

    for (var i in obj) {
      if (has.call(obj, i)) {
        arr.push(i);
      }
    }
    return arr;
  };


/***/ },
/* 485 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {
  /*
   * Module requirements.
   */

  var isArray = __webpack_require__(85);

  /**
   * Module exports.
   */

  module.exports = hasBinary;

  /**
   * Checks for binary data.
   *
   * Right now only Buffer and ArrayBuffer are supported..
   *
   * @param {Object} anything
   * @api public
   */

  function hasBinary(data) {

    function _hasBinary(obj) {
      if (!obj) return false;

      if ( (global.Buffer && global.Buffer.isBuffer(obj)) ||
           (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
           (global.Blob && obj instanceof Blob) ||
           (global.File && obj instanceof File)
          ) {
        return true;
      }

      if (isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (_hasBinary(obj[i])) {
                return true;
            }
        }
      } else if (obj && 'object' == typeof obj) {
        if (obj.toJSON) {
          obj = obj.toJSON();
        }

        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key) && _hasBinary(obj[key])) {
            return true;
          }
        }
      }

      return false;
    }

    return _hasBinary(data);
  }

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 486 */,
/* 487 */,
/* 488 */,
/* 489 */,
/* 490 */,
/* 491 */,
/* 492 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {
  /*
   * Module requirements.
   */

  var isArray = __webpack_require__(85);

  /**
   * Module exports.
   */

  module.exports = hasBinary;

  /**
   * Checks for binary data.
   *
   * Right now only Buffer and ArrayBuffer are supported..
   *
   * @param {Object} anything
   * @api public
   */

  function hasBinary(data) {

    function _hasBinary(obj) {
      if (!obj) return false;

      if ( (global.Buffer && global.Buffer.isBuffer && global.Buffer.isBuffer(obj)) ||
           (global.ArrayBuffer && obj instanceof ArrayBuffer) ||
           (global.Blob && obj instanceof Blob) ||
           (global.File && obj instanceof File)
          ) {
        return true;
      }

      if (isArray(obj)) {
        for (var i = 0; i < obj.length; i++) {
            if (_hasBinary(obj[i])) {
                return true;
            }
        }
      } else if (obj && 'object' == typeof obj) {
        // see: https://github.com/Automattic/has-binary/pull/4
        if (obj.toJSON && 'function' == typeof obj.toJSON) {
          obj = obj.toJSON();
        }

        for (var key in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, key) && _hasBinary(obj[key])) {
            return true;
          }
        }
      }

      return false;
    }

    return _hasBinary(data);
  }

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 493 */
/***/ function(module, exports) {

  
  /**
   * Module exports.
   *
   * Logic borrowed from Modernizr:
   *
   *   - https://github.com/Modernizr/Modernizr/blob/master/feature-detects/cors.js
   */

  try {
    module.exports = typeof XMLHttpRequest !== 'undefined' &&
      'withCredentials' in new XMLHttpRequest();
  } catch (err) {
    // if XMLHttp support is disabled in IE then it will throw
    // when trying to create
    module.exports = false;
  }


/***/ },
/* 494 */,
/* 495 */,
/* 496 */
/***/ function(module, exports, __webpack_require__) {

  var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! JSON v3.3.2 | http://bestiejs.github.io/json3 | Copyright 2012-2014, Kit Cambridge | http://kit.mit-license.org */
  ;(function () {
    // Detect the `define` function exposed by asynchronous module loaders. The
    // strict `define` check is necessary for compatibility with `r.js`.
    var isLoader = "function" === "function" && __webpack_require__(537);

    // A set of types used to distinguish objects from primitives.
    var objectTypes = {
      "function": true,
      "object": true
    };

    // Detect the `exports` object exposed by CommonJS implementations.
    var freeExports = objectTypes[typeof exports] && exports && !exports.nodeType && exports;

    // Use the `global` object exposed by Node (including Browserify via
    // `insert-module-globals`), Narwhal, and Ringo as the default context,
    // and the `window` object in browsers. Rhino exports a `global` function
    // instead.
    var root = objectTypes[typeof window] && window || this,
        freeGlobal = freeExports && objectTypes[typeof module] && module && !module.nodeType && typeof global == "object" && global;

    if (freeGlobal && (freeGlobal["global"] === freeGlobal || freeGlobal["window"] === freeGlobal || freeGlobal["self"] === freeGlobal)) {
      root = freeGlobal;
    }

    // Public: Initializes JSON 3 using the given `context` object, attaching the
    // `stringify` and `parse` functions to the specified `exports` object.
    function runInContext(context, exports) {
      context || (context = root["Object"]());
      exports || (exports = root["Object"]());

      // Native constructor aliases.
      var Number = context["Number"] || root["Number"],
          String = context["String"] || root["String"],
          Object = context["Object"] || root["Object"],
          Date = context["Date"] || root["Date"],
          SyntaxError = context["SyntaxError"] || root["SyntaxError"],
          TypeError = context["TypeError"] || root["TypeError"],
          Math = context["Math"] || root["Math"],
          nativeJSON = context["JSON"] || root["JSON"];

      // Delegate to the native `stringify` and `parse` implementations.
      if (typeof nativeJSON == "object" && nativeJSON) {
        exports.stringify = nativeJSON.stringify;
        exports.parse = nativeJSON.parse;
      }

      // Convenience aliases.
      var objectProto = Object.prototype,
          getClass = objectProto.toString,
          isProperty, forEach, undef;

      // Test the `Date#getUTC*` methods. Based on work by @Yaffle.
      var isExtended = new Date(-3509827334573292);
      try {
        // The `getUTCFullYear`, `Month`, and `Date` methods return nonsensical
        // results for certain dates in Opera >= 10.53.
        isExtended = isExtended.getUTCFullYear() == -109252 && isExtended.getUTCMonth() === 0 && isExtended.getUTCDate() === 1 &&
          // Safari < 2.0.2 stores the internal millisecond time value correctly,
          // but clips the values returned by the date methods to the range of
          // signed 32-bit integers ([-2 ** 31, 2 ** 31 - 1]).
          isExtended.getUTCHours() == 10 && isExtended.getUTCMinutes() == 37 && isExtended.getUTCSeconds() == 6 && isExtended.getUTCMilliseconds() == 708;
      } catch (exception) {}

      // Internal: Determines whether the native `JSON.stringify` and `parse`
      // implementations are spec-compliant. Based on work by Ken Snyder.
      function has(name) {
        if (has[name] !== undef) {
          // Return cached feature test result.
          return has[name];
        }
        var isSupported;
        if (name == "bug-string-char-index") {
          // IE <= 7 doesn't support accessing string characters using square
          // bracket notation. IE 8 only supports this for primitives.
          isSupported = "a"[0] != "a";
        } else if (name == "json") {
          // Indicates whether both `JSON.stringify` and `JSON.parse` are
          // supported.
          isSupported = has("json-stringify") && has("json-parse");
        } else {
          var value, serialized = '{"a":[1,true,false,null,"\\u0000\\b\\n\\f\\r\\t"]}';
          // Test `JSON.stringify`.
          if (name == "json-stringify") {
            var stringify = exports.stringify, stringifySupported = typeof stringify == "function" && isExtended;
            if (stringifySupported) {
              // A test function object with a custom `toJSON` method.
              (value = function () {
                return 1;
              }).toJSON = value;
              try {
                stringifySupported =
                  // Firefox 3.1b1 and b2 serialize string, number, and boolean
                  // primitives as object literals.
                  stringify(0) === "0" &&
                  // FF 3.1b1, b2, and JSON 2 serialize wrapped primitives as object
                  // literals.
                  stringify(new Number()) === "0" &&
                  stringify(new String()) == '""' &&
                  // FF 3.1b1, 2 throw an error if the value is `null`, `undefined`, or
                  // does not define a canonical JSON representation (this applies to
                  // objects with `toJSON` properties as well, *unless* they are nested
                  // within an object or array).
                  stringify(getClass) === undef &&
                  // IE 8 serializes `undefined` as `"undefined"`. Safari <= 5.1.7 and
                  // FF 3.1b3 pass this test.
                  stringify(undef) === undef &&
                  // Safari <= 5.1.7 and FF 3.1b3 throw `Error`s and `TypeError`s,
                  // respectively, if the value is omitted entirely.
                  stringify() === undef &&
                  // FF 3.1b1, 2 throw an error if the given value is not a number,
                  // string, array, object, Boolean, or `null` literal. This applies to
                  // objects with custom `toJSON` methods as well, unless they are nested
                  // inside object or array literals. YUI 3.0.0b1 ignores custom `toJSON`
                  // methods entirely.
                  stringify(value) === "1" &&
                  stringify([value]) == "[1]" &&
                  // Prototype <= 1.6.1 serializes `[undefined]` as `"[]"` instead of
                  // `"[null]"`.
                  stringify([undef]) == "[null]" &&
                  // YUI 3.0.0b1 fails to serialize `null` literals.
                  stringify(null) == "null" &&
                  // FF 3.1b1, 2 halts serialization if an array contains a function:
                  // `[1, true, getClass, 1]` serializes as "[1,true,],". FF 3.1b3
                  // elides non-JSON values from objects and arrays, unless they
                  // define custom `toJSON` methods.
                  stringify([undef, getClass, null]) == "[null,null,null]" &&
                  // Simple serialization test. FF 3.1b1 uses Unicode escape sequences
                  // where character escape codes are expected (e.g., `\b` => `\u0008`).
                  stringify({ "a": [value, true, false, null, "\x00\b\n\f\r\t"] }) == serialized &&
                  // FF 3.1b1 and b2 ignore the `filter` and `width` arguments.
                  stringify(null, value) === "1" &&
                  stringify([1, 2], null, 1) == "[\n 1,\n 2\n]" &&
                  // JSON 2, Prototype <= 1.7, and older WebKit builds incorrectly
                  // serialize extended years.
                  stringify(new Date(-8.64e15)) == '"-271821-04-20T00:00:00.000Z"' &&
                  // The milliseconds are optional in ES 5, but required in 5.1.
                  stringify(new Date(8.64e15)) == '"+275760-09-13T00:00:00.000Z"' &&
                  // Firefox <= 11.0 incorrectly serializes years prior to 0 as negative
                  // four-digit years instead of six-digit years. Credits: @Yaffle.
                  stringify(new Date(-621987552e5)) == '"-000001-01-01T00:00:00.000Z"' &&
                  // Safari <= 5.1.5 and Opera >= 10.53 incorrectly serialize millisecond
                  // values less than 1000. Credits: @Yaffle.
                  stringify(new Date(-1)) == '"1969-12-31T23:59:59.999Z"';
              } catch (exception) {
                stringifySupported = false;
              }
            }
            isSupported = stringifySupported;
          }
          // Test `JSON.parse`.
          if (name == "json-parse") {
            var parse = exports.parse;
            if (typeof parse == "function") {
              try {
                // FF 3.1b1, b2 will throw an exception if a bare literal is provided.
                // Conforming implementations should also coerce the initial argument to
                // a string prior to parsing.
                if (parse("0") === 0 && !parse(false)) {
                  // Simple parsing test.
                  value = parse(serialized);
                  var parseSupported = value["a"].length == 5 && value["a"][0] === 1;
                  if (parseSupported) {
                    try {
                      // Safari <= 5.1.2 and FF 3.1b1 allow unescaped tabs in strings.
                      parseSupported = !parse('"\t"');
                    } catch (exception) {}
                    if (parseSupported) {
                      try {
                        // FF 4.0 and 4.0.1 allow leading `+` signs and leading
                        // decimal points. FF 4.0, 4.0.1, and IE 9-10 also allow
                        // certain octal literals.
                        parseSupported = parse("01") !== 1;
                      } catch (exception) {}
                    }
                    if (parseSupported) {
                      try {
                        // FF 4.0, 4.0.1, and Rhino 1.7R3-R4 allow trailing decimal
                        // points. These environments, along with FF 3.1b1 and 2,
                        // also allow trailing commas in JSON objects and arrays.
                        parseSupported = parse("1.") !== 1;
                      } catch (exception) {}
                    }
                  }
                }
              } catch (exception) {
                parseSupported = false;
              }
            }
            isSupported = parseSupported;
          }
        }
        return has[name] = !!isSupported;
      }

      if (!has("json")) {
        // Common `[[Class]]` name aliases.
        var functionClass = "[object Function]",
            dateClass = "[object Date]",
            numberClass = "[object Number]",
            stringClass = "[object String]",
            arrayClass = "[object Array]",
            booleanClass = "[object Boolean]";

        // Detect incomplete support for accessing string characters by index.
        var charIndexBuggy = has("bug-string-char-index");

        // Define additional utility methods if the `Date` methods are buggy.
        if (!isExtended) {
          var floor = Math.floor;
          // A mapping between the months of the year and the number of days between
          // January 1st and the first of the respective month.
          var Months = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
          // Internal: Calculates the number of days between the Unix epoch and the
          // first day of the given month.
          var getDay = function (year, month) {
            return Months[month] + 365 * (year - 1970) + floor((year - 1969 + (month = +(month > 1))) / 4) - floor((year - 1901 + month) / 100) + floor((year - 1601 + month) / 400);
          };
        }

        // Internal: Determines if a property is a direct property of the given
        // object. Delegates to the native `Object#hasOwnProperty` method.
        if (!(isProperty = objectProto.hasOwnProperty)) {
          isProperty = function (property) {
            var members = {}, constructor;
            if ((members.__proto__ = null, members.__proto__ = {
              // The *proto* property cannot be set multiple times in recent
              // versions of Firefox and SeaMonkey.
              "toString": 1
            }, members).toString != getClass) {
              // Safari <= 2.0.3 doesn't implement `Object#hasOwnProperty`, but
              // supports the mutable *proto* property.
              isProperty = function (property) {
                // Capture and break the object's prototype chain (see section 8.6.2
                // of the ES 5.1 spec). The parenthesized expression prevents an
                // unsafe transformation by the Closure Compiler.
                var original = this.__proto__, result = property in (this.__proto__ = null, this);
                // Restore the original prototype chain.
                this.__proto__ = original;
                return result;
              };
            } else {
              // Capture a reference to the top-level `Object` constructor.
              constructor = members.constructor;
              // Use the `constructor` property to simulate `Object#hasOwnProperty` in
              // other environments.
              isProperty = function (property) {
                var parent = (this.constructor || constructor).prototype;
                return property in this && !(property in parent && this[property] === parent[property]);
              };
            }
            members = null;
            return isProperty.call(this, property);
          };
        }

        // Internal: Normalizes the `for...in` iteration algorithm across
        // environments. Each enumerated key is yielded to a `callback` function.
        forEach = function (object, callback) {
          var size = 0, Properties, members, property;

          // Tests for bugs in the current environment's `for...in` algorithm. The
          // `valueOf` property inherits the non-enumerable flag from
          // `Object.prototype` in older versions of IE, Netscape, and Mozilla.
          (Properties = function () {
            this.valueOf = 0;
          }).prototype.valueOf = 0;

          // Iterate over a new instance of the `Properties` class.
          members = new Properties();
          for (property in members) {
            // Ignore all properties inherited from `Object.prototype`.
            if (isProperty.call(members, property)) {
              size++;
            }
          }
          Properties = members = null;

          // Normalize the iteration algorithm.
          if (!size) {
            // A list of non-enumerable properties inherited from `Object.prototype`.
            members = ["valueOf", "toString", "toLocaleString", "propertyIsEnumerable", "isPrototypeOf", "hasOwnProperty", "constructor"];
            // IE <= 8, Mozilla 1.0, and Netscape 6.2 ignore shadowed non-enumerable
            // properties.
            forEach = function (object, callback) {
              var isFunction = getClass.call(object) == functionClass, property, length;
              var hasProperty = !isFunction && typeof object.constructor != "function" && objectTypes[typeof object.hasOwnProperty] && object.hasOwnProperty || isProperty;
              for (property in object) {
                // Gecko <= 1.0 enumerates the `prototype` property of functions under
                // certain conditions; IE does not.
                if (!(isFunction && property == "prototype") && hasProperty.call(object, property)) {
                  callback(property);
                }
              }
              // Manually invoke the callback for each non-enumerable property.
              for (length = members.length; property = members[--length]; hasProperty.call(object, property) && callback(property));
            };
          } else if (size == 2) {
            // Safari <= 2.0.4 enumerates shadowed properties twice.
            forEach = function (object, callback) {
              // Create a set of iterated properties.
              var members = {}, isFunction = getClass.call(object) == functionClass, property;
              for (property in object) {
                // Store each property name to prevent double enumeration. The
                // `prototype` property of functions is not enumerated due to cross-
                // environment inconsistencies.
                if (!(isFunction && property == "prototype") && !isProperty.call(members, property) && (members[property] = 1) && isProperty.call(object, property)) {
                  callback(property);
                }
              }
            };
          } else {
            // No bugs detected; use the standard `for...in` algorithm.
            forEach = function (object, callback) {
              var isFunction = getClass.call(object) == functionClass, property, isConstructor;
              for (property in object) {
                if (!(isFunction && property == "prototype") && isProperty.call(object, property) && !(isConstructor = property === "constructor")) {
                  callback(property);
                }
              }
              // Manually invoke the callback for the `constructor` property due to
              // cross-environment inconsistencies.
              if (isConstructor || isProperty.call(object, (property = "constructor"))) {
                callback(property);
              }
            };
          }
          return forEach(object, callback);
        };

        // Public: Serializes a JavaScript `value` as a JSON string. The optional
        // `filter` argument may specify either a function that alters how object and
        // array members are serialized, or an array of strings and numbers that
        // indicates which properties should be serialized. The optional `width`
        // argument may be either a string or number that specifies the indentation
        // level of the output.
        if (!has("json-stringify")) {
          // Internal: A map of control characters and their escaped equivalents.
          var Escapes = {
            92: "\\\\",
            34: '\\"',
            8: "\\b",
            12: "\\f",
            10: "\\n",
            13: "\\r",
            9: "\\t"
          };

          // Internal: Converts `value` into a zero-padded string such that its
          // length is at least equal to `width`. The `width` must be <= 6.
          var leadingZeroes = "000000";
          var toPaddedString = function (width, value) {
            // The `|| 0` expression is necessary to work around a bug in
            // Opera <= 7.54u2 where `0 == -0`, but `String(-0) !== "0"`.
            return (leadingZeroes + (value || 0)).slice(-width);
          };

          // Internal: Double-quotes a string `value`, replacing all ASCII control
          // characters (characters with code unit values between 0 and 31) with
          // their escaped equivalents. This is an implementation of the
          // `Quote(value)` operation defined in ES 5.1 section 15.12.3.
          var unicodePrefix = "\\u00";
          var quote = function (value) {
            var result = '"', index = 0, length = value.length, useCharIndex = !charIndexBuggy || length > 10;
            var symbols = useCharIndex && (charIndexBuggy ? value.split("") : value);
            for (; index < length; index++) {
              var charCode = value.charCodeAt(index);
              // If the character is a control character, append its Unicode or
              // shorthand escape sequence; otherwise, append the character as-is.
              switch (charCode) {
                case 8: case 9: case 10: case 12: case 13: case 34: case 92:
                  result += Escapes[charCode];
                  break;
                default:
                  if (charCode < 32) {
                    result += unicodePrefix + toPaddedString(2, charCode.toString(16));
                    break;
                  }
                  result += useCharIndex ? symbols[index] : value.charAt(index);
              }
            }
            return result + '"';
          };

          // Internal: Recursively serializes an object. Implements the
          // `Str(key, holder)`, `JO(value)`, and `JA(value)` operations.
          var serialize = function (property, object, callback, properties, whitespace, indentation, stack) {
            var value, className, year, month, date, time, hours, minutes, seconds, milliseconds, results, element, index, length, prefix, result;
            try {
              // Necessary for host object support.
              value = object[property];
            } catch (exception) {}
            if (typeof value == "object" && value) {
              className = getClass.call(value);
              if (className == dateClass && !isProperty.call(value, "toJSON")) {
                if (value > -1 / 0 && value < 1 / 0) {
                  // Dates are serialized according to the `Date#toJSON` method
                  // specified in ES 5.1 section 15.9.5.44. See section 15.9.1.15
                  // for the ISO 8601 date time string format.
                  if (getDay) {
                    // Manually compute the year, month, date, hours, minutes,
                    // seconds, and milliseconds if the `getUTC*` methods are
                    // buggy. Adapted from @Yaffle's `date-shim` project.
                    date = floor(value / 864e5);
                    for (year = floor(date / 365.2425) + 1970 - 1; getDay(year + 1, 0) <= date; year++);
                    for (month = floor((date - getDay(year, 0)) / 30.42); getDay(year, month + 1) <= date; month++);
                    date = 1 + date - getDay(year, month);
                    // The `time` value specifies the time within the day (see ES
                    // 5.1 section 15.9.1.2). The formula `(A % B + B) % B` is used
                    // to compute `A modulo B`, as the `%` operator does not
                    // correspond to the `modulo` operation for negative numbers.
                    time = (value % 864e5 + 864e5) % 864e5;
                    // The hours, minutes, seconds, and milliseconds are obtained by
                    // decomposing the time within the day. See section 15.9.1.10.
                    hours = floor(time / 36e5) % 24;
                    minutes = floor(time / 6e4) % 60;
                    seconds = floor(time / 1e3) % 60;
                    milliseconds = time % 1e3;
                  } else {
                    year = value.getUTCFullYear();
                    month = value.getUTCMonth();
                    date = value.getUTCDate();
                    hours = value.getUTCHours();
                    minutes = value.getUTCMinutes();
                    seconds = value.getUTCSeconds();
                    milliseconds = value.getUTCMilliseconds();
                  }
                  // Serialize extended years correctly.
                  value = (year <= 0 || year >= 1e4 ? (year < 0 ? "-" : "+") + toPaddedString(6, year < 0 ? -year : year) : toPaddedString(4, year)) +
                    "-" + toPaddedString(2, month + 1) + "-" + toPaddedString(2, date) +
                    // Months, dates, hours, minutes, and seconds should have two
                    // digits; milliseconds should have three.
                    "T" + toPaddedString(2, hours) + ":" + toPaddedString(2, minutes) + ":" + toPaddedString(2, seconds) +
                    // Milliseconds are optional in ES 5.0, but required in 5.1.
                    "." + toPaddedString(3, milliseconds) + "Z";
                } else {
                  value = null;
                }
              } else if (typeof value.toJSON == "function" && ((className != numberClass && className != stringClass && className != arrayClass) || isProperty.call(value, "toJSON"))) {
                // Prototype <= 1.6.1 adds non-standard `toJSON` methods to the
                // `Number`, `String`, `Date`, and `Array` prototypes. JSON 3
                // ignores all `toJSON` methods on these objects unless they are
                // defined directly on an instance.
                value = value.toJSON(property);
              }
            }
            if (callback) {
              // If a replacement function was provided, call it to obtain the value
              // for serialization.
              value = callback.call(object, property, value);
            }
            if (value === null) {
              return "null";
            }
            className = getClass.call(value);
            if (className == booleanClass) {
              // Booleans are represented literally.
              return "" + value;
            } else if (className == numberClass) {
              // JSON numbers must be finite. `Infinity` and `NaN` are serialized as
              // `"null"`.
              return value > -1 / 0 && value < 1 / 0 ? "" + value : "null";
            } else if (className == stringClass) {
              // Strings are double-quoted and escaped.
              return quote("" + value);
            }
            // Recursively serialize objects and arrays.
            if (typeof value == "object") {
              // Check for cyclic structures. This is a linear search; performance
              // is inversely proportional to the number of unique nested objects.
              for (length = stack.length; length--;) {
                if (stack[length] === value) {
                  // Cyclic structures cannot be serialized by `JSON.stringify`.
                  throw TypeError();
                }
              }
              // Add the object to the stack of traversed objects.
              stack.push(value);
              results = [];
              // Save the current indentation level and indent one additional level.
              prefix = indentation;
              indentation += whitespace;
              if (className == arrayClass) {
                // Recursively serialize array elements.
                for (index = 0, length = value.length; index < length; index++) {
                  element = serialize(index, value, callback, properties, whitespace, indentation, stack);
                  results.push(element === undef ? "null" : element);
                }
                result = results.length ? (whitespace ? "[\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "]" : ("[" + results.join(",") + "]")) : "[]";
              } else {
                // Recursively serialize object members. Members are selected from
                // either a user-specified list of property names, or the object
                // itself.
                forEach(properties || value, function (property) {
                  var element = serialize(property, value, callback, properties, whitespace, indentation, stack);
                  if (element !== undef) {
                    // According to ES 5.1 section 15.12.3: "If `gap` {whitespace}
                    // is not the empty string, let `member` {quote(property) + ":"}
                    // be the concatenation of `member` and the `space` character."
                    // The "`space` character" refers to the literal space
                    // character, not the `space` {width} argument provided to
                    // `JSON.stringify`.
                    results.push(quote(property) + ":" + (whitespace ? " " : "") + element);
                  }
                });
                result = results.length ? (whitespace ? "{\n" + indentation + results.join(",\n" + indentation) + "\n" + prefix + "}" : ("{" + results.join(",") + "}")) : "{}";
              }
              // Remove the object from the traversed object stack.
              stack.pop();
              return result;
            }
          };

          // Public: `JSON.stringify`. See ES 5.1 section 15.12.3.
          exports.stringify = function (source, filter, width) {
            var whitespace, callback, properties, className;
            if (objectTypes[typeof filter] && filter) {
              if ((className = getClass.call(filter)) == functionClass) {
                callback = filter;
              } else if (className == arrayClass) {
                // Convert the property names array into a makeshift set.
                properties = {};
                for (var index = 0, length = filter.length, value; index < length; value = filter[index++], ((className = getClass.call(value)), className == stringClass || className == numberClass) && (properties[value] = 1));
              }
            }
            if (width) {
              if ((className = getClass.call(width)) == numberClass) {
                // Convert the `width` to an integer and create a string containing
                // `width` number of space characters.
                if ((width -= width % 1) > 0) {
                  for (whitespace = "", width > 10 && (width = 10); whitespace.length < width; whitespace += " ");
                }
              } else if (className == stringClass) {
                whitespace = width.length <= 10 ? width : width.slice(0, 10);
              }
            }
            // Opera <= 7.54u2 discards the values associated with empty string keys
            // (`""`) only if they are used directly within an object member list
            // (e.g., `!("" in { "": 1})`).
            return serialize("", (value = {}, value[""] = source, value), callback, properties, whitespace, "", []);
          };
        }

        // Public: Parses a JSON source string.
        if (!has("json-parse")) {
          var fromCharCode = String.fromCharCode;

          // Internal: A map of escaped control characters and their unescaped
          // equivalents.
          var Unescapes = {
            92: "\\",
            34: '"',
            47: "/",
            98: "\b",
            116: "\t",
            110: "\n",
            102: "\f",
            114: "\r"
          };

          // Internal: Stores the parser state.
          var Index, Source;

          // Internal: Resets the parser state and throws a `SyntaxError`.
          var abort = function () {
            Index = Source = null;
            throw SyntaxError();
          };

          // Internal: Returns the next token, or `"$"` if the parser has reached
          // the end of the source string. A token may be a string, number, `null`
          // literal, or Boolean literal.
          var lex = function () {
            var source = Source, length = source.length, value, begin, position, isSigned, charCode;
            while (Index < length) {
              charCode = source.charCodeAt(Index);
              switch (charCode) {
                case 9: case 10: case 13: case 32:
                  // Skip whitespace tokens, including tabs, carriage returns, line
                  // feeds, and space characters.
                  Index++;
                  break;
                case 123: case 125: case 91: case 93: case 58: case 44:
                  // Parse a punctuator token (`{`, `}`, `[`, `]`, `:`, or `,`) at
                  // the current position.
                  value = charIndexBuggy ? source.charAt(Index) : source[Index];
                  Index++;
                  return value;
                case 34:
                  // `"` delimits a JSON string; advance to the next character and
                  // begin parsing the string. String tokens are prefixed with the
                  // sentinel `@` character to distinguish them from punctuators and
                  // end-of-string tokens.
                  for (value = "@", Index++; Index < length;) {
                    charCode = source.charCodeAt(Index);
                    if (charCode < 32) {
                      // Unescaped ASCII control characters (those with a code unit
                      // less than the space character) are not permitted.
                      abort();
                    } else if (charCode == 92) {
                      // A reverse solidus (`\`) marks the beginning of an escaped
                      // control character (including `"`, `\`, and `/`) or Unicode
                      // escape sequence.
                      charCode = source.charCodeAt(++Index);
                      switch (charCode) {
                        case 92: case 34: case 47: case 98: case 116: case 110: case 102: case 114:
                          // Revive escaped control characters.
                          value += Unescapes[charCode];
                          Index++;
                          break;
                        case 117:
                          // `\u` marks the beginning of a Unicode escape sequence.
                          // Advance to the first character and validate the
                          // four-digit code point.
                          begin = ++Index;
                          for (position = Index + 4; Index < position; Index++) {
                            charCode = source.charCodeAt(Index);
                            // A valid sequence comprises four hexdigits (case-
                            // insensitive) that form a single hexadecimal value.
                            if (!(charCode >= 48 && charCode <= 57 || charCode >= 97 && charCode <= 102 || charCode >= 65 && charCode <= 70)) {
                              // Invalid Unicode escape sequence.
                              abort();
                            }
                          }
                          // Revive the escaped character.
                          value += fromCharCode("0x" + source.slice(begin, Index));
                          break;
                        default:
                          // Invalid escape sequence.
                          abort();
                      }
                    } else {
                      if (charCode == 34) {
                        // An unescaped double-quote character marks the end of the
                        // string.
                        break;
                      }
                      charCode = source.charCodeAt(Index);
                      begin = Index;
                      // Optimize for the common case where a string is valid.
                      while (charCode >= 32 && charCode != 92 && charCode != 34) {
                        charCode = source.charCodeAt(++Index);
                      }
                      // Append the string as-is.
                      value += source.slice(begin, Index);
                    }
                  }
                  if (source.charCodeAt(Index) == 34) {
                    // Advance to the next character and return the revived string.
                    Index++;
                    return value;
                  }
                  // Unterminated string.
                  abort();
                default:
                  // Parse numbers and literals.
                  begin = Index;
                  // Advance past the negative sign, if one is specified.
                  if (charCode == 45) {
                    isSigned = true;
                    charCode = source.charCodeAt(++Index);
                  }
                  // Parse an integer or floating-point value.
                  if (charCode >= 48 && charCode <= 57) {
                    // Leading zeroes are interpreted as octal literals.
                    if (charCode == 48 && ((charCode = source.charCodeAt(Index + 1)), charCode >= 48 && charCode <= 57)) {
                      // Illegal octal literal.
                      abort();
                    }
                    isSigned = false;
                    // Parse the integer component.
                    for (; Index < length && ((charCode = source.charCodeAt(Index)), charCode >= 48 && charCode <= 57); Index++);
                    // Floats cannot contain a leading decimal point; however, this
                    // case is already accounted for by the parser.
                    if (source.charCodeAt(Index) == 46) {
                      position = ++Index;
                      // Parse the decimal component.
                      for (; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                      if (position == Index) {
                        // Illegal trailing decimal.
                        abort();
                      }
                      Index = position;
                    }
                    // Parse exponents. The `e` denoting the exponent is
                    // case-insensitive.
                    charCode = source.charCodeAt(Index);
                    if (charCode == 101 || charCode == 69) {
                      charCode = source.charCodeAt(++Index);
                      // Skip past the sign following the exponent, if one is
                      // specified.
                      if (charCode == 43 || charCode == 45) {
                        Index++;
                      }
                      // Parse the exponential component.
                      for (position = Index; position < length && ((charCode = source.charCodeAt(position)), charCode >= 48 && charCode <= 57); position++);
                      if (position == Index) {
                        // Illegal empty exponent.
                        abort();
                      }
                      Index = position;
                    }
                    // Coerce the parsed value to a JavaScript number.
                    return +source.slice(begin, Index);
                  }
                  // A negative sign may only precede numbers.
                  if (isSigned) {
                    abort();
                  }
                  // `true`, `false`, and `null` literals.
                  if (source.slice(Index, Index + 4) == "true") {
                    Index += 4;
                    return true;
                  } else if (source.slice(Index, Index + 5) == "false") {
                    Index += 5;
                    return false;
                  } else if (source.slice(Index, Index + 4) == "null") {
                    Index += 4;
                    return null;
                  }
                  // Unrecognized token.
                  abort();
              }
            }
            // Return the sentinel `$` character if the parser has reached the end
            // of the source string.
            return "$";
          };

          // Internal: Parses a JSON `value` token.
          var get = function (value) {
            var results, hasMembers;
            if (value == "$") {
              // Unexpected end of input.
              abort();
            }
            if (typeof value == "string") {
              if ((charIndexBuggy ? value.charAt(0) : value[0]) == "@") {
                // Remove the sentinel `@` character.
                return value.slice(1);
              }
              // Parse object and array literals.
              if (value == "[") {
                // Parses a JSON array, returning a new JavaScript array.
                results = [];
                for (;; hasMembers || (hasMembers = true)) {
                  value = lex();
                  // A closing square bracket marks the end of the array literal.
                  if (value == "]") {
                    break;
                  }
                  // If the array literal contains elements, the current token
                  // should be a comma separating the previous element from the
                  // next.
                  if (hasMembers) {
                    if (value == ",") {
                      value = lex();
                      if (value == "]") {
                        // Unexpected trailing `,` in array literal.
                        abort();
                      }
                    } else {
                      // A `,` must separate each array element.
                      abort();
                    }
                  }
                  // Elisions and leading commas are not permitted.
                  if (value == ",") {
                    abort();
                  }
                  results.push(get(value));
                }
                return results;
              } else if (value == "{") {
                // Parses a JSON object, returning a new JavaScript object.
                results = {};
                for (;; hasMembers || (hasMembers = true)) {
                  value = lex();
                  // A closing curly brace marks the end of the object literal.
                  if (value == "}") {
                    break;
                  }
                  // If the object literal contains members, the current token
                  // should be a comma separator.
                  if (hasMembers) {
                    if (value == ",") {
                      value = lex();
                      if (value == "}") {
                        // Unexpected trailing `,` in object literal.
                        abort();
                      }
                    } else {
                      // A `,` must separate each object member.
                      abort();
                    }
                  }
                  // Leading commas are not permitted, object property names must be
                  // double-quoted strings, and a `:` must separate each property
                  // name and value.
                  if (value == "," || typeof value != "string" || (charIndexBuggy ? value.charAt(0) : value[0]) != "@" || lex() != ":") {
                    abort();
                  }
                  results[value.slice(1)] = get(lex());
                }
                return results;
              }
              // Unexpected token encountered.
              abort();
            }
            return value;
          };

          // Internal: Updates a traversed object member.
          var update = function (source, property, callback) {
            var element = walk(source, property, callback);
            if (element === undef) {
              delete source[property];
            } else {
              source[property] = element;
            }
          };

          // Internal: Recursively traverses a parsed JSON object, invoking the
          // `callback` function for each value. This is an implementation of the
          // `Walk(holder, name)` operation defined in ES 5.1 section 15.12.2.
          var walk = function (source, property, callback) {
            var value = source[property], length;
            if (typeof value == "object" && value) {
              // `forEach` can't be used to traverse an array in Opera <= 8.54
              // because its `Object#hasOwnProperty` implementation returns `false`
              // for array indices (e.g., `![1, 2, 3].hasOwnProperty("0")`).
              if (getClass.call(value) == arrayClass) {
                for (length = value.length; length--;) {
                  update(value, length, callback);
                }
              } else {
                forEach(value, function (property) {
                  update(value, property, callback);
                });
              }
            }
            return callback.call(source, property, value);
          };

          // Public: `JSON.parse`. See ES 5.1 section 15.12.2.
          exports.parse = function (source, callback) {
            var result, value;
            Index = 0;
            Source = "" + source;
            result = get(lex());
            // If a JSON string contains multiple tokens, it is invalid.
            if (lex() != "$") {
              abort();
            }
            // Reset the parser state.
            Index = Source = null;
            return callback && getClass.call(callback) == functionClass ? walk((value = {}, value[""] = result, value), "", callback) : result;
          };
        }
      }

      exports["runInContext"] = runInContext;
      return exports;
    }

    if (freeExports && !isLoader) {
      // Export for CommonJS environments.
      runInContext(root, freeExports);
    } else {
      // Export for web browsers and JavaScript engines.
      var nativeJSON = root.JSON,
          previousJSON = root["JSON3"],
          isRestored = false;

      var JSON3 = runInContext(root, (root["JSON3"] = {
        // Public: Restores the original value of the global `JSON` object and
        // returns a reference to the `JSON3` object.
        "noConflict": function () {
          if (!isRestored) {
            isRestored = true;
            root.JSON = nativeJSON;
            root["JSON3"] = previousJSON;
            nativeJSON = previousJSON = null;
          }
          return JSON3;
        }
      }));

      root.JSON = {
        "parse": JSON3.parse,
        "stringify": JSON3.stringify
      };
    }

    // Export for asynchronous module loaders.
    if (isLoader) {
      !(__WEBPACK_AMD_DEFINE_RESULT__ = function () {
        return JSON3;
      }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    }
  }).call(this);

  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(418)(module), (function() { return this; }())))

/***/ },
/* 497 */,
/* 498 */
/***/ function(module, exports) {

  /* WEBPACK VAR INJECTION */(function(global) {/**
   * JSON parse.
   *
   * @see Based on jQuery#parseJSON (MIT) and JSON2
   * @api private
   */

  var rvalidchars = /^[\],:{}\s]*$/;
  var rvalidescape = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
  var rvalidtokens = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
  var rvalidbraces = /(?:^|:|,)(?:\s*\[)+/g;
  var rtrimLeft = /^\s+/;
  var rtrimRight = /\s+$/;

  module.exports = function parsejson(data) {
    if ('string' != typeof data || !data) {
      return null;
    }

    data = data.replace(rtrimLeft, '').replace(rtrimRight, '');

    // Attempt to parse using the native JSON parser first
    if (global.JSON && JSON.parse) {
      return JSON.parse(data);
    }

    if (rvalidchars.test(data.replace(rvalidescape, '@')
        .replace(rvalidtokens, ']')
        .replace(rvalidbraces, ''))) {
      return (new Function('return ' + data))();
    }
  };
  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 499 */,
/* 500 */,
/* 501 */,
/* 502 */,
/* 503 */,
/* 504 */,
/* 505 */,
/* 506 */,
/* 507 */,
/* 508 */,
/* 509 */,
/* 510 */,
/* 511 */,
/* 512 */,
/* 513 */,
/* 514 */,
/* 515 */,
/* 516 */,
/* 517 */
/***/ function(module, exports, __webpack_require__) {

  
  /**
   * Module dependencies.
   */

  var url = __webpack_require__(518);
  var parser = __webpack_require__(380);
  var Manager = __webpack_require__(413);
  var debug = __webpack_require__(13)('socket.io-client');

  /**
   * Module exports.
   */

  module.exports = exports = lookup;

  /**
   * Managers cache.
   */

  var cache = exports.managers = {};

  /**
   * Looks up an existing `Manager` for multiplexing.
   * If the user summons:
   *
   *   `io('http://localhost/a');`
   *   `io('http://localhost/b');`
   *
   * We reuse the existing instance based on same scheme/port/host,
   * and we initialize sockets for each namespace.
   *
   * @api public
   */

  function lookup(uri, opts) {
    if (typeof uri == 'object') {
      opts = uri;
      uri = undefined;
    }

    opts = opts || {};

    var parsed = url(uri);
    var source = parsed.source;
    var id = parsed.id;
    var path = parsed.path;
    var sameNamespace = cache[id] && path in cache[id].nsps;
    var newConnection = opts.forceNew || opts['force new connection'] ||
                        false === opts.multiplex || sameNamespace;

    var io;

    if (newConnection) {
      debug('ignoring socket cache for %s', source);
      io = Manager(source, opts);
    } else {
      if (!cache[id]) {
        debug('new io instance for %s', source);
        cache[id] = Manager(source, opts);
      }
      io = cache[id];
    }

    return io.socket(parsed.path);
  }

  /**
   * Protocol version.
   *
   * @api public
   */

  exports.protocol = parser.protocol;

  /**
   * `connect`.
   *
   * @param {String} uri
   * @api public
   */

  exports.connect = lookup;

  /**
   * Expose constructors for standalone build.
   *
   * @api public
   */

  exports.Manager = __webpack_require__(413);
  exports.Socket = __webpack_require__(415);


/***/ },
/* 518 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {
  /**
   * Module dependencies.
   */

  var parseuri = __webpack_require__(410);
  var debug = __webpack_require__(13)('socket.io-client:url');

  /**
   * Module exports.
   */

  module.exports = url;

  /**
   * URL parser.
   *
   * @param {String} url
   * @param {Object} An object meant to mimic window.location.
   *                 Defaults to window.location.
   * @api public
   */

  function url(uri, loc){
    var obj = uri;

    // default to window.location
    var loc = loc || global.location;
    if (null == uri) uri = loc.protocol + '//' + loc.host;

    // relative path support
    if ('string' == typeof uri) {
      if ('/' == uri.charAt(0)) {
        if ('/' == uri.charAt(1)) {
          uri = loc.protocol + uri;
        } else {
          uri = loc.host + uri;
        }
      }

      if (!/^(https?|wss?):\/\//.test(uri)) {
        debug('protocol-less url %s', uri);
        if ('undefined' != typeof loc) {
          uri = loc.protocol + '//' + uri;
        } else {
          uri = 'https://' + uri;
        }
      }

      // parse
      debug('parse %s', uri);
      obj = parseuri(uri);
    }

    // make sure we treat `localhost:80` and `localhost` equally
    if (!obj.port) {
      if (/^(http|ws)$/.test(obj.protocol)) {
        obj.port = '80';
      }
      else if (/^(http|ws)s$/.test(obj.protocol)) {
        obj.port = '443';
      }
    }

    obj.path = obj.path || '/';

    var ipv6 = obj.host.indexOf(':') !== -1;
    var host = ipv6 ? '[' + obj.host + ']' : obj.host;

    // define unique id
    obj.id = obj.protocol + '://' + host + ':' + obj.port;
    // define href
    obj.href = obj.protocol + '://' + host + (loc && loc.port == obj.port ? '' : (':' + obj.port));

    return obj;
  }

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 519 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(global) {/*global Blob,File*/

  /**
   * Module requirements
   */

  var isArray = __webpack_require__(85);
  var isBuf = __webpack_require__(416);

  /**
   * Replaces every Buffer | ArrayBuffer in packet with a numbered placeholder.
   * Anything with blobs or files should be fed through removeBlobs before coming
   * here.
   *
   * @param {Object} packet - socket.io event packet
   * @return {Object} with deconstructed packet and list of buffers
   * @api public
   */

  exports.deconstructPacket = function(packet){
    var buffers = [];
    var packetData = packet.data;

    function _deconstructPacket(data) {
      if (!data) return data;

      if (isBuf(data)) {
        var placeholder = { _placeholder: true, num: buffers.length };
        buffers.push(data);
        return placeholder;
      } else if (isArray(data)) {
        var newData = new Array(data.length);
        for (var i = 0; i < data.length; i++) {
          newData[i] = _deconstructPacket(data[i]);
        }
        return newData;
      } else if ('object' == typeof data && !(data instanceof Date)) {
        var newData = {};
        for (var key in data) {
          newData[key] = _deconstructPacket(data[key]);
        }
        return newData;
      }
      return data;
    }

    var pack = packet;
    pack.data = _deconstructPacket(packetData);
    pack.attachments = buffers.length; // number of binary 'attachments'
    return {packet: pack, buffers: buffers};
  };

  /**
   * Reconstructs a binary packet from its placeholder packet and buffers
   *
   * @param {Object} packet - event packet with placeholders
   * @param {Array} buffers - binary buffers to put in placeholder positions
   * @return {Object} reconstructed packet
   * @api public
   */

  exports.reconstructPacket = function(packet, buffers) {
    var curPlaceHolder = 0;

    function _reconstructPacket(data) {
      if (data && data._placeholder) {
        var buf = buffers[data.num]; // appropriate buffer (should be natural order anyway)
        return buf;
      } else if (isArray(data)) {
        for (var i = 0; i < data.length; i++) {
          data[i] = _reconstructPacket(data[i]);
        }
        return data;
      } else if (data && 'object' == typeof data) {
        for (var key in data) {
          data[key] = _reconstructPacket(data[key]);
        }
        return data;
      }
      return data;
    }

    packet.data = _reconstructPacket(packet.data);
    packet.attachments = undefined; // no longer useful
    return packet;
  };

  /**
   * Asynchronously removes Blobs or Files from data via
   * FileReader's readAsArrayBuffer method. Used before encoding
   * data as msgpack. Calls callback with the blobless data.
   *
   * @param {Object} data
   * @param {Function} callback
   * @api private
   */

  exports.removeBlobs = function(data, callback) {
    function _removeBlobs(obj, curKey, containingObject) {
      if (!obj) return obj;

      // convert any blob
      if ((global.Blob && obj instanceof Blob) ||
          (global.File && obj instanceof File)) {
        pendingBlobs++;

        // async filereader
        var fileReader = new FileReader();
        fileReader.onload = function() { // this.result == arraybuffer
          if (containingObject) {
            containingObject[curKey] = this.result;
          }
          else {
            bloblessData = this.result;
          }

          // if nothing pending its callback time
          if(! --pendingBlobs) {
            callback(bloblessData);
          }
        };

        fileReader.readAsArrayBuffer(obj); // blob -> arraybuffer
      } else if (isArray(obj)) { // handle array
        for (var i = 0; i < obj.length; i++) {
          _removeBlobs(obj[i], i, obj);
        }
      } else if (obj && 'object' == typeof obj && !isBuf(obj)) { // and object
        for (var key in obj) {
          _removeBlobs(obj[key], key, obj);
        }
      }
    }

    var pendingBlobs = 0;
    var bloblessData = data;
    _removeBlobs(bloblessData);
    if (!pendingBlobs) {
      callback(bloblessData);
    }
  };

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 520 */,
/* 521 */
/***/ function(module, exports) {

  module.exports = toArray

  function toArray(list, index) {
      var array = []

      index = index || 0

      for (var i = index || 0; i < list.length; i++) {
          array[i - index] = list[i]
      }

      return array
  }


/***/ },
/* 522 */,
/* 523 */,
/* 524 */,
/* 525 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  var rxjs_1 = __webpack_require__(24);
  var io = __webpack_require__(517);
  var SignalingAdapter_1 = __webpack_require__(382);
  var SignalingActionCreator_1 = __webpack_require__(384);
  var Debug = __webpack_require__(13);
  var debug = Debug("warp:signaling:adapter");
  var SocketIoAdapter = (function (_super) {
      __extends(SocketIoAdapter, _super);
      function SocketIoAdapter(config) {
          var _this = _super.call(this) || this;
          _this._action = new SignalingActionCreator_1.SignalingActionCreator();
          _this._dispatcher = _this._action.dispatcher;
          _this._config = config;
          _this._socket = io(_this._config.signalingServerURL);
          _this._socket.on("connect", function () {
              debug("connected");
          });
          rxjs_1.Observable.fromEvent(_this._socket, "updatePeerList").subscribe(_this._dispatcher.updatePeerList);
          rxjs_1.Observable.fromEvent(_this._socket, "login").subscribe(_this._dispatcher.login);
          rxjs_1.Observable.fromEvent(_this._socket, "public-chat").subscribe(_this._dispatcher.receiveChatMessage);
          rxjs_1.Observable.fromEvent(_this._socket, "ring").subscribe(_this._dispatcher.ringRequest);
          rxjs_1.Observable.fromEvent(_this._socket, "response").subscribe(_this._dispatcher.ringResponse);
          rxjs_1.Observable.fromEvent(_this._socket, "candidate").subscribe(_this._dispatcher.receiveICECandidate);
          rxjs_1.Observable.fromEvent(_this._socket, "connect").subscribe(_this._dispatcher.connect);
          rxjs_1.Observable.fromEvent(_this._socket, "disconnect").subscribe(_this._dispatcher.disconnect);
          rxjs_1.Observable.fromEvent(_this._socket, "reconnect").subscribe(_this._dispatcher.reconnect);
          rxjs_1.Observable.fromEvent(_this._socket, "reconnect_error").subscribe(_this._dispatcher.connectionError);
          rxjs_1.Observable.fromEvent(_this._socket, "reconnect_failed").subscribe(_this._dispatcher.connectionError);
          rxjs_1.Observable.fromEvent(_this._socket, "error").subscribe(_this._dispatcher.connectionError);
          rxjs_1.Observable.fromEvent(_this._socket, "authentication_error").subscribe(_this._dispatcher.connectionError);
          _this._socket.on("disconnect", function () {
              debug("disconnected");
          });
          return _this;
      }
      SocketIoAdapter.prototype.login = function (credential) {
          this._socket.emit("login", {
              credential: credential ? credential : this._config["credential"],
              availableAgents: ["default"]
          });
      };
      SocketIoAdapter.prototype.sendChatMessage = function (message) {
          this._socket.emit("public-chat", message);
      };
      SocketIoAdapter.prototype.sendOffer = function (senderAgentId, receiverAgentId, remoteId, sdp) {
          if (!receiverAgentId) {
              sdp = JSON.stringify(sdp).replace(/\\r\\n/g, "\n");
          }
      };
      SocketIoAdapter.prototype.sendIceCandidate = function (candidate) {
          this._socket.emit("candidate", candidate);
      };
      SocketIoAdapter.prototype.response = function (resp) {
          this._socket.emit("response", resp);
      };
      SocketIoAdapter.prototype.sendUpdatePeersListRequest = function () {
          this._socket.emit("peersList");
      };
      SocketIoAdapter.prototype.closeConnection = function () {
          this._socket.close();
      };
      SocketIoAdapter.prototype.ring = function (request) {
          this._socket.emit("ring", request);
      };
      SocketIoAdapter.prototype.fetchPeersList = function () {
      };
      SocketIoAdapter.prototype.updatePeersList = function (_a) {
          var peers = _a.peers;
      };
      return SocketIoAdapter;
  }(SignalingAdapter_1.SignalingAdapter));
  exports.SocketIoAdapter = SocketIoAdapter;


/***/ },
/* 526 */,
/* 527 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var rxjs_1 = __webpack_require__(24);
  var Debug = __webpack_require__(13);
  var RTCActionCreator_1 = __webpack_require__(531);
  var debug = Debug("warp:rtc");
  var debugDC = Debug("warp:rtc:dc");
  var RTCAgent = (function () {
      function RTCAgent(signalingServer, config, agentId) {
          this._subscription = new rxjs_1.Subscription();
          this._agentId = agentId;
          this._action = new RTCActionCreator_1.RTCActionCreator();
          this._dispatcher = this._action.dispatcher;
          this._config = config;
          this.signalingServer = signalingServer;
          this.stream = null;
          this._peer = null;
          this.dataChannel = null;
      }
      Object.defineProperty(RTCAgent.prototype, "peer", {
          get: function () {
              return this.remote.id;
          },
          enumerable: true,
          configurable: true
      });
      RTCAgent.prototype.init = function () {
          var _this = this;
          this._peer = this.initRTCPeerConnection(this._config);
          if (this.stream) {
              this._peer.addStream(this.stream);
          }
          this._peer.onicecandidate = this.sendIceCandidateFromEvent.bind(this);
          // this._peer.onnegotiationneeded = this.debugConnectionStateFromEvent.bind(this);
          rxjs_1.Observable.fromEvent(this._peer, "signalingstatechange").subscribe(function (event) {
              debug("signaling==================", event);
          });
          rxjs_1.Observable.fromEvent(this._peer, "iceconnectionstatechange")
              .filter(function (event) { return event.target.iceConnectionState === "failed"; })
              .pluck("target")
              .subscribe(this._dispatcher.connectionError);
          rxjs_1.Observable.fromEvent(this._peer, "iceconnectionstatechange")
              .filter(function (event) { return event.target.iceConnectionState === "disconnect"; })
              .pluck("target")
              .subscribe(this._dispatcher.close);
          this._peer.onstatechange = this.debugConnectionStateFromEvent.bind(this);
          this._peer.onidentityresult = function (e) { debug("Identity Result ", e); };
          this._peer.onconnecting = function (e) { debug("Connecting ", e); };
          window.onbeforeunload = function (e) {
              _this.closeConnection();
          };
          this._peer.onaddstream = function (streamEvent) {
              debug(_this._agentId, "receive stream ======================");
              _this._dispatcher.stream.next(streamEvent.stream);
              _this._dispatcher.track.next({
                  stream: streamEvent.stream,
                  receiverAgentId: _this._agentId,
                  senderAgentId: _this.remote.agentId
              });
          };
          this._peer.onremovestream = function (e) { debug("stream removed"); };
      };
      RTCAgent.prototype.on = function (eventName, callback) {
          debug(eventName);
          if (this._dispatcher.hasOwnProperty(eventName)) {
              debug("register callback: " + eventName);
              this._subscription.add(this._dispatcher[eventName].subscribe(callback));
          }
          else {
              console.error("event: " + eventName + " does not exist");
          }
      };
      Object.defineProperty(RTCAgent.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      Object.defineProperty(RTCAgent.prototype, "id", {
          get: function () {
              return this._agentId;
          },
          enumerable: true,
          configurable: true
      });
      RTCAgent.prototype.closeConnection = function () {
          // TODO dispose all subscription and destroy peer, then peer should be reinstantiated.
          if (this.dataChannel.readyState === "open") {
              this.dataChannel.send("Closing Connection...");
          }
          this.dataChannel.close();
          if (this._peer.signalingState !== "closed") {
              this._peer.close();
          }
          this._dispatcher.close.next(this);
      };
      RTCAgent.prototype.initRTCPeerConnection = function (config) {
          if ("webkitRTCPeerConnection" in window) {
              return new webkitRTCPeerConnection(config);
          }
          if ("RTCPeerConnection" in window) {
              return new RTCPeerConnection(config, null);
          }
      };
      RTCAgent.prototype.initDataChannel = function (channel) {
          var _this = this;
          this.dataChannel = channel || this._peer.createDataChannel("default");
          this.dataChannel.onopen = function (e) {
              debug("DC Open");
              _this._dispatcher.dataChannelOpen.next(e);
              _this._dispatcher.open.next(e);
          };
          this.dataChannel.onclose = function (e) {
              _this._dispatcher.dataChannelClose.next(e);
              debug("DC close");
              _this.closeConnection();
          };
          this.dataChannel.onmessage = function (msg) {
              _this._dispatcher.dataChannelMessage.next(msg);
              _this._dispatcher.data.next(msg.data);
              debugDC(msg);
          };
      };
      RTCAgent.prototype.debugConnectionStateFromEvent = function (event) {
          var state = {
              iceConnectionState: event.target.iceConnectionState,
              iceGatheringState: event.target.iceGatheringState,
              idpLoginUrl: event.target.idpLoginUrl,
              canTrickleIceCandidates: event.target.canTrickleIceCandidates,
              signalingState: event.target.signalingState,
              type: event.type,
              timeStamp: event.timeStamp
          };
          // this.onConnectionStateChange.next(event);
          debug(this._agentId, "connection state change", state);
      };
      RTCAgent.prototype.ring = function (receiver) {
          var _this = this;
          debug(this._agentId, "create offer");
          // setup RTCPeerConnection
          this.init();
          this.initDataChannel();
          this.remote = receiver;
          this._peer.createOffer(function (sdp) {
              _this._peer.setLocalDescription(sdp);
              _this.signalingServer.ring(_this._agentId, receiver, sdp);
          }, function (err) {
              debug(_this._agentId, "Failed to create offer", err);
          });
      };
      RTCAgent.prototype.setOffer = function (sdp) {
          var _this = this;
          debug(this._agentId, "set remote offer");
          // setup RTCPeerConnection
          this.init();
          this._peer.ondatachannel = function (e) { _this.initDataChannel(e["channel"]); };
          this._peer.setRemoteDescription(new RTCSessionDescription(sdp), this.createAnswer.bind(this), function (err) {
              debug(err, "err");
          });
      };
      RTCAgent.prototype.setAnswer = function (sdp) {
          debug(this._agentId, "set remote anser");
          this._peer.setRemoteDescription(new RTCSessionDescription(sdp));
      };
      RTCAgent.prototype.sendIceCandidateTo = function (candidate) {
          debug(this._agentId, "Send ICE candidate :", this.remote);
          this.signalingServer.sendIceCandidate(this._agentId, this.remote, candidate);
      };
      RTCAgent.prototype.sendIceCandidateFromEvent = function (event) {
          if (!this.remote.id) {
              debug(this._agentId, "Missing RemotePeer Information", this);
              // TODO: throw error
              return undefined;
          }
          if (event.candidate) {
              this.sendIceCandidateTo(event.candidate);
          }
          else {
              debug(this._agentId, "End of candidates. ------------------- phase=" + event.eventPhase);
          }
      };
      RTCAgent.prototype.createAnswer = function () {
          var _this = this;
          debug(this._agentId, "create answer ============== ");
          debug(this._agentId + " => " + this.remote);
          this._peer.createAnswer(function (sdp) {
              _this._peer.setLocalDescription(sdp);
              _this.signalingServer.sendAnswer(_this._agentId, _this.remote, sdp);
          }, function (err) {
              debug("Failed to create answer", err);
          });
      };
      RTCAgent.prototype.setRemoteCandidate = function (candidateString) {
          var candidate = new RTCIceCandidate(candidateString);
          debug("Received Candidate: ", candidate);
          this._peer.addIceCandidate(candidate, function () { }, function () { });
      };
      // PeerJS Comaptible APIs
      RTCAgent.prototype.send = function (data) {
          this.dataChannel.send(data);
      };
      RTCAgent.prototype.close = function () {
          this.closeConnection();
      };
      return RTCAgent;
  }());
  exports.RTCAgent = RTCAgent;


/***/ },
/* 528 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var __extends = (this && this.__extends) || function (d, b) {
      for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
      function __() { this.constructor = d; }
      d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
  // import {PhoenixAdapter} from "../adapter/PhoenixAdapter";
  var SocketIoAdapter_1 = __webpack_require__(525);
  var Debug = __webpack_require__(13);
  var debug = Debug("warp:signaling:driver");
  var InvalidAdapterTypeError = (function (_super) {
      __extends(InvalidAdapterTypeError, _super);
      function InvalidAdapterTypeError(message) {
          var _this = _super.call(this, message) || this;
          _this.message = message;
          _this.name = "Invalid Adapter Type specified";
          _this.stack = new Error().stack;
          return _this;
      }
      return InvalidAdapterTypeError;
  }(Error));
  InvalidAdapterTypeError.UNSUPPORTED_TYPE = "Please provide a 'String', 'Uint8Array' or 'Array'.";
  /**
   * SignalingDriver class is responcible for passing VALID peer data to adapter.
   *
   */
  var SignalingDriver = (function () {
      function SignalingDriver(config, adapter) {
          var _this = this;
          if (adapter) {
              this._adapter = adapter;
          }
          else {
              switch (config.signalingServerType.toLowerCase()) {
                  // case "phoenix":
                  //   this._adapter = new PhoenixAdapter(config);
                  //   break;
                  case "socketio":
                      this._adapter = new SocketIoAdapter_1.SocketIoAdapter(config);
                      break;
                  default:
                      throw new InvalidAdapterTypeError("config.signalingServerType specified invalid type : " + config.signalingServerType + " ");
              }
          }
          this._dispatcher = this._adapter.dispatcher;
          this._dispatcher.login.subscribe(function (info) {
              debug(info);
              _this.id = info.id;
              _this.name = info.name;
          });
          this._dispatcher.connectionError.subscribe(function (error) {
              console.error("signaling error", error);
          });
      }
      SignalingDriver.prototype.login = function () {
          this._adapter.login();
      };
      SignalingDriver.prototype.sendChatMessage = function (message) {
          this._adapter.sendChatMessage(message);
      };
      SignalingDriver.prototype.sendIceCandidate = function (agentId, receiver, candidate) {
          this._adapter.sendIceCandidate({
              header: {
                  receiver: receiver,
                  sender: this.toAddress(agentId),
              },
              method: "candidate",
              body: { candidate: candidate }
          });
      };
      SignalingDriver.prototype.sendAnswer = function (agentId, receiver, sdp) {
          this._adapter.response({
              header: {
                  receiver: receiver,
                  sender: this.toAddress(agentId),
              },
              method: "response",
              body: { sdp: sdp }
          });
      };
      SignalingDriver.prototype.sendUpdatePeersListRequest = function () {
      };
      Object.defineProperty(SignalingDriver.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      SignalingDriver.prototype.closeConnection = function () {
          // TODO dispose all subscription and destroy peer, then peer should be reinstantiated.
      };
      SignalingDriver.prototype.ring = function (agentId, receiver, sdp) {
          debug("ring to ", receiver);
          this._adapter.ring({
              header: {
                  receiver: receiver,
                  sender: this.toAddress(agentId),
              },
              method: "ring",
              body: { sdp: sdp }
          });
      };
      SignalingDriver.prototype.toAddress = function (agentId) {
          return {
              id: this.id,
              name: this.name,
              agentId: agentId
          };
      };
      SignalingDriver.prototype.fetchPeersList = function () {
      };
      SignalingDriver.prototype.updatePeersList = function (_a) {
          var peers = _a.peers;
      };
      return SignalingDriver;
  }());
  exports.SignalingDriver = SignalingDriver;


/***/ },
/* 529 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var PeerDispatcher_1 = __webpack_require__(530);
  var PeerActionCreator = (function () {
      function PeerActionCreator() {
          this._dispatcher = new PeerDispatcher_1.PeerDispatcher();
      }
      Object.defineProperty(PeerActionCreator.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      return PeerActionCreator;
  }());
  exports.PeerActionCreator = PeerActionCreator;


/***/ },
/* 530 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var rxjs_1 = __webpack_require__(24);
  var PeerDispatcher = (function () {
      function PeerDispatcher() {
          this.login = new rxjs_1.Subject();
          this.updatePeerList = new rxjs_1.Subject();
          this.serverStatusChanged = new rxjs_1.Subject();
          this.receiveChatMessage = new rxjs_1.Subject();
          this.ringRequest = new rxjs_1.Subject();
          this.ringResponse = new rxjs_1.Subject();
          this.receiveICECandidate = new rxjs_1.Subject();
          this.connectionStateChange = new rxjs_1.Subject();
          this.close = new rxjs_1.Subject();
          this.addStream = new rxjs_1.Subject();
          this.signalingServerError = new rxjs_1.Subject();
          this.data = new rxjs_1.Subject();
          this.error = new rxjs_1.Subject();
          // PeerJS Comaptible API
          this.open = new rxjs_1.Subject();
          this.call = new rxjs_1.Subject();
          this.connection = new rxjs_1.Subject();
      }
      return PeerDispatcher;
  }());
  exports.PeerDispatcher = PeerDispatcher;


/***/ },
/* 531 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var RTCDispatcher_1 = __webpack_require__(532);
  var RTCActionCreator = (function () {
      function RTCActionCreator() {
          this._dispatcher = new RTCDispatcher_1.RTCDispatcher();
      }
      Object.defineProperty(RTCActionCreator.prototype, "dispatcher", {
          get: function () {
              return this._dispatcher;
          },
          enumerable: true,
          configurable: true
      });
      return RTCActionCreator;
  }());
  exports.RTCActionCreator = RTCActionCreator;


/***/ },
/* 532 */
/***/ function(module, exports, __webpack_require__) {

  /* vim: set ft=typescript expandtab sw=2 sts=2 ff=unix fenc=utf-8 : */
  "use strict";
  var rxjs_1 = __webpack_require__(24);
  var RTCDispatcher = (function () {
      function RTCDispatcher() {
          this.dataChannelOpen = new rxjs_1.Subject();
          this.dataChannelClose = new rxjs_1.Subject();
          this.dataChannelMessage = new rxjs_1.Subject();
          this.track = new rxjs_1.Subject();
          this.removeStream = new rxjs_1.Subject();
          this.close = new rxjs_1.Subject();
          this.connectionError = new rxjs_1.Subject();
          // PeerJS Comaptible API
          this.open = new rxjs_1.Subject();
          this.call = new rxjs_1.Subject();
          this.data = new rxjs_1.Subject();
          this.stream = new rxjs_1.Subject();
      }
      return RTCDispatcher;
  }());
  exports.RTCDispatcher = RTCDispatcher;


/***/ },
/* 533 */,
/* 534 */
/***/ function(module, exports, __webpack_require__) {

  var __WEBPACK_AMD_DEFINE_RESULT__;/* WEBPACK VAR INJECTION */(function(module, global) {/*! https://mths.be/utf8js v2.0.0 by @mathias */
  ;(function(root) {

    // Detect free variables `exports`
    var freeExports = typeof exports == 'object' && exports;

    // Detect free variable `module`
    var freeModule = typeof module == 'object' && module &&
      module.exports == freeExports && module;

    // Detect free variable `global`, from Node.js or Browserified code,
    // and use it as `root`
    var freeGlobal = typeof global == 'object' && global;
    if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal) {
      root = freeGlobal;
    }

    /*--------------------------------------------------------------------------*/

    var stringFromCharCode = String.fromCharCode;

    // Taken from https://mths.be/punycode
    function ucs2decode(string) {
      var output = [];
      var counter = 0;
      var length = string.length;
      var value;
      var extra;
      while (counter < length) {
        value = string.charCodeAt(counter++);
        if (value >= 0xD800 && value <= 0xDBFF && counter < length) {
          // high surrogate, and there is a next character
          extra = string.charCodeAt(counter++);
          if ((extra & 0xFC00) == 0xDC00) { // low surrogate
            output.push(((value & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000);
          } else {
            // unmatched surrogate; only append this code unit, in case the next
            // code unit is the high surrogate of a surrogate pair
            output.push(value);
            counter--;
          }
        } else {
          output.push(value);
        }
      }
      return output;
    }

    // Taken from https://mths.be/punycode
    function ucs2encode(array) {
      var length = array.length;
      var index = -1;
      var value;
      var output = '';
      while (++index < length) {
        value = array[index];
        if (value > 0xFFFF) {
          value -= 0x10000;
          output += stringFromCharCode(value >>> 10 & 0x3FF | 0xD800);
          value = 0xDC00 | value & 0x3FF;
        }
        output += stringFromCharCode(value);
      }
      return output;
    }

    function checkScalarValue(codePoint) {
      if (codePoint >= 0xD800 && codePoint <= 0xDFFF) {
        throw Error(
          'Lone surrogate U+' + codePoint.toString(16).toUpperCase() +
          ' is not a scalar value'
        );
      }
    }
    /*--------------------------------------------------------------------------*/

    function createByte(codePoint, shift) {
      return stringFromCharCode(((codePoint >> shift) & 0x3F) | 0x80);
    }

    function encodeCodePoint(codePoint) {
      if ((codePoint & 0xFFFFFF80) == 0) { // 1-byte sequence
        return stringFromCharCode(codePoint);
      }
      var symbol = '';
      if ((codePoint & 0xFFFFF800) == 0) { // 2-byte sequence
        symbol = stringFromCharCode(((codePoint >> 6) & 0x1F) | 0xC0);
      }
      else if ((codePoint & 0xFFFF0000) == 0) { // 3-byte sequence
        checkScalarValue(codePoint);
        symbol = stringFromCharCode(((codePoint >> 12) & 0x0F) | 0xE0);
        symbol += createByte(codePoint, 6);
      }
      else if ((codePoint & 0xFFE00000) == 0) { // 4-byte sequence
        symbol = stringFromCharCode(((codePoint >> 18) & 0x07) | 0xF0);
        symbol += createByte(codePoint, 12);
        symbol += createByte(codePoint, 6);
      }
      symbol += stringFromCharCode((codePoint & 0x3F) | 0x80);
      return symbol;
    }

    function utf8encode(string) {
      var codePoints = ucs2decode(string);
      var length = codePoints.length;
      var index = -1;
      var codePoint;
      var byteString = '';
      while (++index < length) {
        codePoint = codePoints[index];
        byteString += encodeCodePoint(codePoint);
      }
      return byteString;
    }

    /*--------------------------------------------------------------------------*/

    function readContinuationByte() {
      if (byteIndex >= byteCount) {
        throw Error('Invalid byte index');
      }

      var continuationByte = byteArray[byteIndex] & 0xFF;
      byteIndex++;

      if ((continuationByte & 0xC0) == 0x80) {
        return continuationByte & 0x3F;
      }

      // If we end up here, itâ€™s not a continuation byte
      throw Error('Invalid continuation byte');
    }

    function decodeSymbol() {
      var byte1;
      var byte2;
      var byte3;
      var byte4;
      var codePoint;

      if (byteIndex > byteCount) {
        throw Error('Invalid byte index');
      }

      if (byteIndex == byteCount) {
        return false;
      }

      // Read first byte
      byte1 = byteArray[byteIndex] & 0xFF;
      byteIndex++;

      // 1-byte sequence (no continuation bytes)
      if ((byte1 & 0x80) == 0) {
        return byte1;
      }

      // 2-byte sequence
      if ((byte1 & 0xE0) == 0xC0) {
        var byte2 = readContinuationByte();
        codePoint = ((byte1 & 0x1F) << 6) | byte2;
        if (codePoint >= 0x80) {
          return codePoint;
        } else {
          throw Error('Invalid continuation byte');
        }
      }

      // 3-byte sequence (may include unpaired surrogates)
      if ((byte1 & 0xF0) == 0xE0) {
        byte2 = readContinuationByte();
        byte3 = readContinuationByte();
        codePoint = ((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3;
        if (codePoint >= 0x0800) {
          checkScalarValue(codePoint);
          return codePoint;
        } else {
          throw Error('Invalid continuation byte');
        }
      }

      // 4-byte sequence
      if ((byte1 & 0xF8) == 0xF0) {
        byte2 = readContinuationByte();
        byte3 = readContinuationByte();
        byte4 = readContinuationByte();
        codePoint = ((byte1 & 0x0F) << 0x12) | (byte2 << 0x0C) |
          (byte3 << 0x06) | byte4;
        if (codePoint >= 0x010000 && codePoint <= 0x10FFFF) {
          return codePoint;
        }
      }

      throw Error('Invalid UTF-8 detected');
    }

    var byteArray;
    var byteCount;
    var byteIndex;
    function utf8decode(byteString) {
      byteArray = ucs2decode(byteString);
      byteCount = byteArray.length;
      byteIndex = 0;
      var codePoints = [];
      var tmp;
      while ((tmp = decodeSymbol()) !== false) {
        codePoints.push(tmp);
      }
      return ucs2encode(codePoints);
    }

    /*--------------------------------------------------------------------------*/

    var utf8 = {
      'version': '2.0.0',
      'encode': utf8encode,
      'decode': utf8decode
    };

    // Some AMD build optimizers, like r.js, check for specific condition patterns
    // like the following:
    if (
      true
    ) {
      !(__WEBPACK_AMD_DEFINE_RESULT__ = function() {
        return utf8;
      }.call(exports, __webpack_require__, exports, module), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
    } else if (freeExports && !freeExports.nodeType) {
      if (freeModule) { // in Node.js or RingoJS v0.8.0+
        freeModule.exports = utf8;
      } else { // in Narwhal or RingoJS v0.7.0-
        var object = {};
        var hasOwnProperty = object.hasOwnProperty;
        for (var key in utf8) {
          hasOwnProperty.call(utf8, key) && (freeExports[key] = utf8[key]);
        }
      }
    } else { // in Rhino or a web browser
      root.utf8 = utf8;
    }

  }(this));

  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(418)(module), (function() { return this; }())))

/***/ },
/* 535 */,
/* 536 */,
/* 537 */
/***/ function(module, exports) {

  /* WEBPACK VAR INJECTION */(function(__webpack_amd_options__) {module.exports = __webpack_amd_options__;

  /* WEBPACK VAR INJECTION */}.call(exports, {}))

/***/ },
/* 538 */,
/* 539 */
/***/ function(module, exports) {

  /* (ignored) */

/***/ }
/******/ ])
});
;
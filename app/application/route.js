import Ember from 'ember';
import C from 'ui/utils/constants';

export default Ember.Route.extend({
  cookies        : Ember.inject.service(),
  github         : Ember.inject.service(),
  access         : Ember.inject.service(),
  settings       : Ember.inject.service(),
  language       : Ember.inject.service('user-language'),

  previousParams : null,
  previousRoute  : null,
  loadingShown   : false,
  loadingId      : 0,
  hideTimer      : null,
  previousLang   : null,

  actions: {
    loading(transition) {
      this.incrementProperty('loadingId');
      let id = this.get('loadingId');
      Ember.run.cancel(this.get('hideTimer'));

      //console.log('Loading', id);
      if ( !this.get('loadingShown') ) {
        this.set('loadingShown', true);
        //console.log('Loading Show', id);

        $('#loading-underlay').stop().show().fadeIn({duration: 100, queue: false, easing: 'linear', complete: function() {
          $('#loading-overlay').stop().show().fadeIn({duration: 200, queue: false, easing: 'linear'});
        }});
      }

      transition.finally(() => {
        var self = this;
        function hide() {
          //console.log('Loading hide', id);
          self.set('loadingShown', false);
          $('#loading-overlay').stop().fadeOut({duration: 200, queue: false, easing: 'linear', complete: function() {
            $('#loading-underlay').stop().fadeOut({duration: 100, queue: false, easing: 'linear'});
          }});
        }

        if ( this.get('loadingId') === id ) {
          if ( transition.isAborted ) {
            //console.log('Loading aborted', id, this.get('loadingId'));
            this.set('hideTimer', Ember.run.next(hide));
          } else {
            //console.log('Loading finished', id, this.get('loadingId'));
            hide();
          }
        }
      });

      return true;
    },

    openOverlay(template, view, model, controller) {
      view = view || 'overlay';
      return this.render(template, {
        into       : 'application',
        outlet     : 'overlay',
        view       : view,
        model      : model,
        controller : controller,
      });
    },

    closeOverlay() {
      return this.disconnectOutlet({
        parentView : 'application',
        outlet     : 'overlay'
      });
    },

    error(err, transition) {
      /*if we dont abort the transition we'll call the model calls again and fail transition correctly*/
      transition.abort();

      this.controllerFor('application').set('error',err);
      this.transitionTo('failWhale');

      console.log('Application Error', (err ? err.stack : undefined));
    },

    goToPrevious(def) {
      this.goToPrevious(def);
    },

    finishLogin() {
      this.finishLogin();
    },

    logout(transition, timedOut, errorMsg) {
      let session = this.get('session');

      session.set(C.SESSION.ACCOUNT_ID,null);

      this.get('tab-session').clear();

      this.get('access').clearSessionKeys();

      if ( transition ) {
        session.set(C.SESSION.BACK_TO, window.location.href);
      }

      let params = {queryParams: {}};

      if ( timedOut ) {
        params.queryParams.timedOut = true;
      }

      if ( errorMsg ) {
        params.queryParams.errorMsg = errorMsg;
      }

      this.transitionTo('login', params);
    },

    langToggle() {
      let svc = this.get('language');
      let cur = svc.getLanguage();
      if ( cur === 'none' ) {
        svc.sideLoadLanguage(this.get('previousLang')||'en-us');
      } else {
        this.set('previousLang', cur);
        svc.sideLoadLanguage('none');
      }
    }
  },

  shortcuts: {
    'shift+l': 'langToggle',
  },

  finishLogin() {
    let session = this.get('session');

    let backTo = session.get(C.SESSION.BACK_TO);
    session.set(C.SESSION.BACK_TO, undefined);

    if ( backTo ) {
      window.location.href = backTo;
    } else {
      this.replaceWith('authenticated');
    }
  },

  model(params, transition) {
    let github   = this.get('github');
    let stateMsg = 'Authorization state did not match, please try again.';

    this.get('language').initLanguage();

    if (params.isPopup) {
      this.controllerFor('application').set('isPopup', true);
    }

    if ( params.isTest ) {
      if ( github.stateMatches(params.state) ) {
        reply(params.error_description, params.code);
      } else {
        reply(stateMsg);
      }

      transition.abort();

      return Ember.RSVP.reject('isTest');

    } else if ( params.code ) {

      if ( github.stateMatches(params.state) ) {
        return this.get('access').login(params.code).then(() => {
          // Abort the orignial transition that was coming in here since
          // we'll redirect the user manually in finishLogin
          // if we dont then model hook runs twice to finish the transition itself
          transition.abort();
          // Can't call this.send() here because the initial transition isn't done yet
          this.finishLogin();
        }).catch((err) => {
          this.transitionTo('login', {queryParams: { errorMsg: err.message}});
        }).finally(() => {
          this.controllerFor('application').setProperties({
            state: null,
            code: null,
          });
        });

      } else {

        let obj = {message: stateMsg, code: 'StateMismatch'};

        this.controllerFor('application').set('error', obj);

        return Ember.RSVP.reject(obj);
      }
    }

    function reply(err,code) {
      try {
        window.opener.window.onGithubTest(err,code);
        setTimeout(function() {
          window.close();
        },250);
        return new Ember.RSVP.promise();
      } catch(e) {
        window.close();
      }
    }
  },

  updateWindowTitle: function() {
    document.title = this.get('settings.appName');
  }.observes('settings.appName'),

  beforeModel() {
    this.updateWindowTitle();

    let agent = window.navigator.userAgent.toLowerCase();

    if ( agent.indexOf('msie ') >= 0 || agent.indexOf('trident/') >= 0 ) {
      this.replaceWith('ie');
      return;
    }

    // Find out if auth is enabled
    return this.get('access').detect();
  },

  setupController(controller/*, model*/) {
    controller.set('code',null);
    controller.set('state',null);
    controller.set('error_description',null);
  }
});

/*jshint -W015*/
'use strict';

var routes = [
  {
    id: 'members',
    route: {
      url: '/members',
      templateUrl: '/views/team.members.html',
      menu: { name: 'Team Members' },
      analytics: { screenview: { screenName: 'Team Members' } }
    }
  },
  {
    id: 'settings',
    route: {
      url: '/settings',
      templateUrl: '/views/team.settings.html',
      menu: { name: 'Team Settings' },
      analytics: { screenview: { screenName: 'Team Settings' } }
    }
  },
  {
    id: 'queue',
    route: {
      url: '/queue',
      templateUrl: '/views/queue.html',
      theme: 'queue',
      menu: { name: 'Queued Posts' },
      analytics: { screenview: { screenName: 'Queue' } }
    }
  },
  {
    id: 'bulk-schedule',
    route: {
      url: '/bulk-schedule',
      templateUrl: '/views/bulk-schedule.html',
      menu: { name: 'Bulk Schedule' },
      analytics: { screenview: { screenName: 'Bulk Schedule' } }
    }
  },
  {
    id: 'profiles',
    route: {
      url: '/social-accounts',
      templateUrl: '/views/team.profiles.html',
      menu: { name: 'Social Accounts' },
      analytics: { screenview: { screenName: 'Social Accounts' } }
    }
  },
  {
    id: 'billing',
    route: {
      url: '/billing',
      templateUrl: '/views/billing.html',
      menu: { name: 'Team Billing' },
      analytics: { screenview: { screenName: 'Team Billing' } }
    }
  },
  {
    id: 'billing-plan',
    route: {
      url: '/billing/:plan',
      templateUrl: '/views/billing.html',
      menu: { name: 'Team Billing' },
      analytics: { screenview: { screenName: 'Team Billing' } }
    }
  },
  {
    id: 'invoices',
    route: {
      url: '/invoices',
      templateUrl: '/views/team.invoices.html',
      menu: { name: 'Invoices' },
      analytics: { screenview: { screenName: 'Invoices' } }
    }
  },
  {
    id: 'drafts',
    route: {
      url: '/drafts',
      templateUrl: '/views/drafts.html',
      theme: 'draft',
      menu: { name: 'Drafts' },
      analytics: { screenview: { screenName: 'Drafts' } }
    }
  },
  {
    id: 'timeline',
    route: {
      url: '/timeline',
      templateUrl: '/views/timeline.html',
      menu: { name: 'Published Posts' },
      analytics: { screenview: { screenName: 'Timeline' } }
    }
  },
  {
    id: 'extension',
    route: {
      url: '/extension',
      templateUrl: '/views/extension.html',
      menu: { name: 'Friends+Me Extension and Apps' },
      analytics: { screenview: { screenName: 'Extension And Apps' } }
    }
  },
  {
    id: 'profile-ccchange',
    route: {
      url: '/ccc',
      templateUrl: '/views/profileCCChange.html',
      menu: { name: 'Change Credit Card' },
      analytics: { screenview: { screenName: 'Change Credit Card' } }
    }
  },
  {
    id: 'profile-ccsuccess',
    route: {
      url: '/cc-success',
      templateUrl: '/views/profileCCSuccess.html',
      menu: { name: 'Plan Successfully Upgraded' },
      analytics: { screenview: { screenName: 'Upgraded with Credit Card' } }
    }
  },
  {
    id: 'profile-downgrade',
    route: {
      url: '/downgrade',
      templateUrl: '/views/profileDowngrade.html',
      menu: { name: 'Downgrade Subscription' },
      analytics: { screenview: { screenName: 'Downgrade Subscription' } }
    }
  },
  {
    id: 'profile-downgradesuccess',
    route: {
      url: '/downgrade-success',
      templateUrl: '/views/profileDowngradeSuccess.html',
      menu: { name: 'Subscription Downgraded' },
      analytics: { screenview: { screenName: 'Subscription Downgraded' } }
    }
  },
  {
    id: 'profile-organization',
    route: {
      url: '/organization',
      templateUrl: '/views/profileOrganization.html',
      menu: { name: 'Your Organization' },
      analytics: { screenview: { screenName: 'Organization' } }
    }
  },
  {
    id: 'profile-paypalsuccess',
    route: {
      url: '/paypal-success',
      templateUrl: '/views/profilePayPalSuccess.html',
      menu: { name: 'Plan Upgraded' },
      analytics: { screenview: { screenName: 'Upgraded with PayPal' } }
    }
  },
  {
    id: 'profile-saas',
    absolute: true,
    route: { url: '/administration/saas', templateUrl: '/views/adminSaaS.html', menu: { name: 'SaaS' } }
  },
  {
    id: 'profile-userswitch',
    absolute: true,
    route: {
      url: '/administration/user/switch',
      templateUrl: '/views/adminUserSwitch.html',
      menu: { name: 'Switch User' }
    }
  },
  {
    id: 'profile-userswitch-typevalue',
    absolute: true,
    route: {
      url: '/administration/user/switch/:type/:value',
      templateUrl: '/views/adminUserSwitch.html',
      menu: { name: 'Switch User' }
    }
  },
  {
    id: 'accounts-add',
    route: {
      url: '/queues/add',
      templateUrl: '/views/accountsAdd.html',
      menu: { name: 'Add Queue' },
      analytics: { screenview: { screenName: 'Add Queue' } }
    }
  },
  {
    id: 'accounts-add-network',
    route: {
      url: '/queues/add/:network',
      templateUrl: '/views/accountsAdd.html',
      menu: { name: 'Add Queue' },
      analytics: { screenview: { screenName: 'Add Queue - Network' } }
    }
  },
  {
    id: 'accounts-add-network-profile',
    route: {
      url: '/queues/add/:network/:profile',
      templateUrl: '/views/accountsAdd.html',
      menu: { name: 'Add Queue' },
      analytics: { screenview: { screenName: 'Add Queue - Network - Profile' } }
    }
  },
  {
    id: 'accounts-add-network-reconnect',
    route: {
      url: '/queues/add/:network/:reconnectAccount/reconnect',
      templateUrl: '/views/accountsAdd.html',
      menu: { name: 'Reconnect Queue' },
      analytics: { screenview: { screenName: 'Reconnect Queue - Network' } }
    }
  },
  {
    id: 'accounts-add-network-type',
    route: {
      url: '/queues/add/:network/:type',
      templateUrl: '/views/accountsAdd.html',
      menu: { name: 'Add Queue' },
      analytics: { screenview: { screenName: 'Add Queue - Network - Type' } }
    }
  },
  { id: 'queues', route: { url: '/queues', template: '<div ui-view></div>' } },
  { id: 'queues.aid', route: { url: '/{aid:[0-9a-f]+}', templateUrl: '/views/accounts.html' } },
  {
    id: 'queues.aid.timeline-post',
    route: {
      url: '/timeline/{postid:[0-9a-f]+}',
      templateUrl: '/views/accountTimeline.html',
      menu: { name: 'Published Post' },
      analytics: { screenview: { screenName: 'Published Post' } }
    }
  },
  {
    id: 'queues.aid.queue-post',
    route: {
      url: '/queue/{postid:[0-9a-f]+}',
      templateUrl: '/views/accountQueue.html',
      theme: 'queue',
      menu: { name: 'Queued Post' },
      analytics: { screenview: { screenName: 'Queued Post' } }
    }
  },  
  {
    id: 'queues.aid.timeline',
    route: {
      url: '/timeline',
      templateUrl: '/views/accountTimeline.html',
      menu: { name: 'Published Posts' },
      analytics: { screenview: { screenName: 'Queue Timeline' } }
    }
  },
  {
    id: 'queues.aid.reconnect',
    route: {
      url: '/reconnect',
      templateUrl: '/views/accountReconnect.html',
      menu: { name: 'Reconnect Queue' },
      analytics: { screenview: { screenName: 'Reconnect Queue' } }
    }
  },
  {
    id: 'queues.aid.queue',
    route: {
      url: '/queue',
      templateUrl: '/views/accountQueue.html',
      theme: 'queue',
      menu: { name: 'Queued Posts' },
      analytics: { screenview: { screenName: 'Queue' } }
    }
  },
  {
    id: 'queues.aid.scheduling',
    route: {
      url: '/scheduling',
      templateUrl: '/views/accountScheduling.html',
      menu: { name: 'Setup Scheduling' },
      analytics: { screenview: { screenName: 'Queue Scheduling' } }
    }
  },
  {
    id: 'queues.aid.setup',
    route: {
      url: '/setup',
      templateUrl: '/views/accountSetup.html',
      menu: { name: 'Settings' },
      analytics: { screenview: { screenName: 'Queue Setup' } }
    }
  },
  {
    id: 'queues.aid.shortening',
    route: {
      url: '/shortening',
      templateUrl: '/views/accountShortening.html',
      menu: { name: 'Link Shortening' },
      analytics: { screenview: { screenName: 'Queue Link Shortening' } }
    }
  }
];

angular.module('fpmApp').constant('routes', routes);

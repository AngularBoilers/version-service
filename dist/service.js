'use strict';
angular.module('myApp').config(['$stateProvider', function($stateProvider) {
 $stateProvider.state('root', {
  url: '',
  abstract: true,
  views: {
   'sidebar': {
    templateUrl: 'components/partials/sidebar.html',
    controller: 'sidebarController'
   }
  }
 });
}]).config(function($qProvider) {
 $qProvider.errorOnUnhandledRejections(false);
}).config(function($mdThemingProvider) {
 var customBlueMap = $mdThemingProvider.extendPalette('light-blue', {
  'contrastDefaultColor': 'light',
  'contrastDarkColors': ['50'],
  '50': 'ffffff'
 });
 $mdThemingProvider.definePalette('customBlue', customBlueMap);
 $mdThemingProvider.theme('default').primaryPalette('customBlue', {
  'default': '500',
  'hue-1': '50'
 }).accentPalette('pink');
 $mdThemingProvider.theme('input', 'default').primaryPalette('grey')
}).config(function($mdIconProvider) {
 $mdIconProvider.fontSet('md', 'material-icons');
}).config(function($mdAriaProvider) {
 $mdAriaProvider.disableWarnings();
}).config(['uiGmapGoogleMapApiProvider', function(GoogleMapApiProviders) {
 GoogleMapApiProviders.configure({
  china: true
 });
}]).run(['authFact', '$firebaseObject', 'ActivityMonitor', '$state', '$mdToast', function(authFact, $firebaseObject, ActivityMonitor, $state, $mdToast) {
 var ialert = false;
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 };

 function showToast(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').highlightAction(true).highlightClass('md-accent').position(pinTo).hideDelay(60000);
  $mdToast.show(toast).then(function(response) {});
 };

 function updateLocation() {
  var options = {
   enableHighAccuracy: true,
  };
  navigator.geolocation.getCurrentPosition(function(pos) {
   authFact.setAccuracy(pos.coords.accuracy);
   var position = new google.maps.LatLng(pos.coords.latitude, pos.coords.longitude);
   var current = JSON.stringify(position);
   var admin_area1, admin_area2, country = '';
   var geocoder = new google.maps.Geocoder();
   if (authFact.getLocation() != current) {
    geocoder.geocode({
     'latLng': position
    }, function(results, status) {
     if (status == google.maps.GeocoderStatus.OK) {
      if (results[0]) {
       for (var i = 0; i < results[0].address_components.length; i++) {
        for (var b = 0; b < results[0].address_components[i].types.length; b++) {
         if (results[0].address_components[i].types[b] == "administrative_area_level_1") {
          admin_area1 = results[0].address_components[i].long_name;
          break;
         } else if (results[0].address_components[i].types[b] == "administrative_area_level_2") {
          admin_area2 = results[0].address_components[i].long_name;
          break;
         } else if (results[0].address_components[i].types[b] == "country") {
          country = results[0].address_components[i].long_name;
          break;
         }
        }
       }
       if (admin_area1) {
        authFact.saveInfo('administrative_area_level_1', admin_area1);
       } else {
        admin_area1 = authFact.getInfo('administrative_area_level_1');
        if (!admin_area1) {
         admin_area1 = 'undefined'
        }
       }
       if (admin_area2) {
        authFact.saveInfo('administrative_area_level_2', admin_area2);
       } else {
        admin_area2 = authFact.getInfo('administrative_area_level_2');
        if (!admin_area2) {
         admin_area2 = 'undefined'
        }
       }
       if (country) {
        authFact.saveInfo('country', country);
       } else {
        country = authFact.getInfo('country');
        if (!country) {
         country = 'undefined'
        }
       }
       var uid = authFact.getUserId();
       var ref = firebase.database().ref().child('drivers').child(uid).child('location');
       var obj = $firebaseObject(ref);
       var temp = JSON.parse(current);
       obj.$value = {
        lat: temp.lat,
        lng: temp.lng,
        uid: uid,
        area_level1: admin_area1,
        area_level2: admin_area2,
        country: country
       };
       obj.$save().then(function() {
        authFact.setLocation(current);
       }).catch(function(error) {});
      }
     }
    });
   }
  }, function(error) {
   if (!ialert) {
    showToast('Looks that location is blocked for this web app, please allow the location in settings !! ');
    ialert = true;
   }
  }, options);
 }
 if (authFact.isAuthenticated())
  updateLocation();
 setInterval(function() {
  if (authFact.isAuthenticated())
   updateLocation();
 }, 5000);
}]).directive('foot', function() {
 return {
  restrict: 'A',
  replace: true,
  templateUrl: 'components/partials/footer.html',
  controller: ['$scope', '$filter', 'authFact', '$cookies', function($scope, $filter, authFact, $cookies) {
   var accr = authFact.getAccuracy();
   $scope.$watch(function() {
    return $cookies.get('user_id');
   }, function(newValue) {
    $scope.auth = authFact.isAuthenticated();
   });
   $scope.$watch(function() {
    return $cookies.get('accur');
   }, function(accr) {
    if (accr < 25) {
     $scope.color = 'green';
     $scope.sign = '<';
     $scope.number = '5 m';
    } else if (accr < 55) {
     $scope.color = 'yellow';
     $scope.sign = '<';
     $scope.number = '50 m';
    } else if (accr < 120) {
     $scope.color = 'orange';
     $scope.sign = '>';
     $scope.number = '50 m';
    } else {
     $scope.color = 'red';
     $scope.number = 'Unknown';
    }
   });
  }]
 }
}).controller('sidebarController', ['$scope', 'authFact', 'ActivityMonitor', '$state', function($scope, authFact, ActivityMonitor, $state) {
 $scope.email = authFact.getUserEmail();
 $scope.name = authFact.getUserName();
 $scope.photo = authFact.getUserPhoto();
 if ($scope.photo == 'null' || $scope.name == 'null' || $scope.photo == null) {
  $scope.perm = true;
  $scope.photo = '/components/images/mytaxi.png';
 }
 ActivityMonitor.options.inactive = 1800;
 ActivityMonitor.on('inactive', function() {
  authFact.destroyCookies();
  $state.go('root.login');
 });
}]);
angular.module('myApp').service('authService', ['$http', 'APP_URL', function($http, APP_URL) {
 var Auth = {};
 Auth.login = function(email, password) {
  var payload = {
   email: email,
   password: password
  };
  return $http.post(APP_URL + 'signin', payload);
 };
 Auth.register = function(payload) {
  return $http.post(APP_URL + 'register', payload);
 };
 Auth.fcm = function(payload) {
  return $http.post(APP_URL + 'driver/fcm', payload);
 };
 Auth.checkFCM = function(payload) {
  return $http.post(APP_URL + 'driver/checkFCM', payload);
 };
 Auth.profile = function(payload) {
  return $http.post(APP_URL + 'driver/profile', payload);
 };
 Auth.logout = function() {
  return $http.get(APP_URL + 'logout');
 };
 return Auth;
}]).directive('userAvatar', function() {
 return {
  replace: true,
  template: '<svg class="user-avatar" viewBox="0 0 128 128" height="64" width="64" pointer-events="none" display="block" > <path fill="#FF8A80" d="M0 0h128v128H0z"/> <path fill="#FFE0B2" d="M36.3 94.8c6.4 7.3 16.2 12.1 27.3 12.4 10.7-.3 20.3-4.7 26.7-11.6l.2.1c-17-13.3-12.9-23.4-8.5-28.6 1.3-1.2 2.8-2.5 4.4-3.9l13.1-11c1.5-1.2 2.6-3 2.9-5.1.6-4.4-2.5-8.4-6.9-9.1-1.5-.2-3 0-4.3.6-.3-1.3-.4-2.7-1.6-3.5-1.4-.9-2.8-1.7-4.2-2.5-7.1-3.9-14.9-6.6-23-7.9-5.4-.9-11-1.2-16.1.7-3.3 1.2-6.1 3.2-8.7 5.6-1.3 1.2-2.5 2.4-3.7 3.7l-1.8 1.9c-.3.3-.5.6-.8.8-.1.1-.2 0-.4.2.1.2.1.5.1.6-1-.3-2.1-.4-3.2-.2-4.4.6-7.5 4.7-6.9 9.1.3 2.1 1.3 3.8 2.8 5.1l11 9.3c1.8 1.5 3.3 3.8 4.6 5.7 1.5 2.3 2.8 4.9 3.5 7.6 1.7 6.8-.8 13.4-5.4 18.4-.5.6-1.1 1-1.4 1.7-.2.6-.4 1.3-.6 2-.4 1.5-.5 3.1-.3 4.6.4 3.1 1.8 6.1 4.1 8.2 3.3 3 8 4 12.4 4.5 5.2.6 10.5.7 15.7.2 4.5-.4 9.1-1.2 13-3.4 5.6-3.1 9.6-8.9 10.5-15.2M76.4 46c.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6-.1-.9.7-1.6 1.6-1.6zm-25.7 0c.9 0 1.6.7 1.6 1.6 0 .9-.7 1.6-1.6 1.6-.9 0-1.6-.7-1.6-1.6-.1-.9.7-1.6 1.6-1.6z"/> <path fill="#E0F7FA" d="M105.3 106.1c-.9-1.3-1.3-1.9-1.3-1.9l-.2-.3c-.6-.9-1.2-1.7-1.9-2.4-3.2-3.5-7.3-5.4-11.4-5.7 0 0 .1 0 .1.1l-.2-.1c-6.4 6.9-16 11.3-26.7 11.6-11.2-.3-21.1-5.1-27.5-12.6-.1.2-.2.4-.2.5-3.1.9-6 2.7-8.4 5.4l-.2.2s-.5.6-1.5 1.7c-.9 1.1-2.2 2.6-3.7 4.5-3.1 3.9-7.2 9.5-11.7 16.6-.9 1.4-1.7 2.8-2.6 4.3h109.6c-3.4-7.1-6.5-12.8-8.9-16.9-1.5-2.2-2.6-3.8-3.3-5z"/> <circle fill="#444" cx="76.3" cy="47.5" r="2"/> <circle fill="#444" cx="50.7" cy="47.6" r="2"/> <path fill="#444" d="M48.1 27.4c4.5 5.9 15.5 12.1 42.4 8.4-2.2-6.9-6.8-12.6-12.6-16.4C95.1 20.9 92 10 92 10c-1.4 5.5-11.1 4.4-11.1 4.4H62.1c-1.7-.1-3.4 0-5.2.3-12.8 1.8-22.6 11.1-25.7 22.9 10.6-1.9 15.3-7.6 16.9-10.2z"/> </svg>'
 };
}).filter('reverse', function() {
 return function(items) {
  if (!angular.isArray(items)) {
   return items;
  }
  return items.slice().reverse();
 };
});
angular.module('myApp').factory('authFact', ['$cookies', '$state', '$http', '$location', 'APP_URL', function($cookies, $state, $http, $location, APP_URL) {
 var authFact = {};
 var authKey = 'JWT';
 var today = new Date();
 var expiresValue = new Date(today);
 expiresValue.setMinutes(today.getMinutes() + 300);
 authFact.setAccessToken = function(accessToken) {
  localStorage.setItem(authKey, accessToken);
 };
 authFact.getAccessToken = function() {
  authFact.authToken = localStorage.getItem(authKey);
  return authFact.authToken;
 };
 authFact.setUserObj = function(userObj) {
  $cookies.put('email', userObj.email, {
   'expires': expiresValue
  });
  $cookies.put('user_id', userObj.user_id, {
   'expires': expiresValue
  });
  $cookies.put('displayName', userObj.name, {
   'expires': expiresValue
  });
  $cookies.put('photoURL', userObj.photo, {
   'expires': expiresValue
  });
 };
 authFact.getUserEmail = function() {
  var userObj = $cookies.get('email');
  if (userObj)
   return userObj;
 };
 authFact.getUserId = function() {
  var userId = $cookies.get('user_id');
  if (userId)
   return userId;
 };
 authFact.getUserPhoto = function() {
  return $cookies.get('photoURL');
 };
 authFact.getUserName = function() {
  return $cookies.get('displayName');
 };
 authFact.buildCookies = function(data) {
  var userObj = {};
  userObj.user_id = data.uid;
  userObj.email = data.email;
  userObj.name = data.displayName;
  userObj.photo = data.photoURL;
  authFact.setUserObj(userObj);
  authFact.setAccessToken(data.access_token);
 };
 authFact.saveInfo = function(key, value) {
  $cookies.put(key, value, {
   'expires': expiresValue
  });
 };
 authFact.saveConstants = function(key, value) {
  $cookies.put(key, value);
 };
 authFact.getInfo = function(key) {
  return $cookies.get(key);
 };
 authFact.destroyCookies = function() {
  localStorage.removeItem(authKey);
  $cookies.remove('email');
  $cookies.remove('user_id');
  $cookies.remove('administrative_area_level_1');
  $cookies.remove('administrative_area_level_2');
  $cookies.remove('country');
  $cookies.remove('profile');
  $cookies.remove('displayName');
  $cookies.remove('photoURL');
  $cookies.remove('location');
 };
 authFact.Authenticate = function() {
  var access_token = localStorage.getItem(authKey);
  var myId = $cookies.get('user_id');
  var profile = $cookies.get('profile');
  if (!access_token || !myId) {
   authFact.destroyCookies();
   $state.go('root.login');
  } else if (access_token && myId) {
   if (!profile)
    $state.go('root.profile', {}, {
     reload: true
    });
  }
 };
 authFact.profileAuthenticate = function() {
  var access_token = localStorage.getItem(authKey);
  var myId = $cookies.get('user_id');
  if (!access_token || !myId) {
   authFact.destroyCookies();
   $state.go('root.login');
  }
 };
 authFact.isAuthenticated = function() {
  var access_token = localStorage.getItem(authKey);
  var myId = $cookies.get('user_id');
  if (!access_token || !myId) {
   return false;
  } else
   return true;
 };
 authFact.setLocation = function(locat) {
  $cookies.put('location', locat, {
   'expires': expiresValue
  });
 };
 authFact.getLocation = function() {
  return $cookies.get('location');
 };
 authFact.setAccuracy = function(acc) {
  $cookies.put('accur', acc, {
   'expires': expiresValue
  });
 };
 authFact.getAccuracy = function(acc) {
  return $cookies.get('accur');
 };
 authFact.getProfile = function() {
  return $cookies.get('profile');
 };
 return authFact;
}]);
angular.module('myApp.driver', []).config(['$stateProvider', function($stateProvider) {
 $stateProvider.state('root.dashboard', {
  url: '/',
  views: {
   'container@': {
    templateUrl: 'driver/views/dashboard.html',
    controller: 'dashboardController'
   }
  },
  onEnter: function(authFact) {
   authFact.Authenticate();
  }
 }).state('root.login', {
  url: '/login',
  views: {
   'container@': {
    templateUrl: 'driver/views/login.html',
    controller: 'loginController'
   }
  }
 }).state('root.register', {
  url: '/register',
  views: {
   'container@': {
    templateUrl: 'driver/views/register.html',
    controller: 'registerController'
   }
  }
 }).state('root.request', {
  url: '/request/:id',
  views: {
   'container@': {
    templateUrl: 'driver/views/detail.html',
    controller: 'requestController'
   }
  },
  onEnter: function(authFact) {
   authFact.Authenticate();
  }
 }).state('root.bid', {
  url: '/bid/:id',
  views: {
   'container@': {
    templateUrl: 'driver/views/bid.html',
    controller: 'bidController'
   }
  },
  onEnter: function(authFact) {
   authFact.Authenticate();
  }
 }).state('root.job', {
  url: '/job/:id',
  views: {
   'container@': {
    templateUrl: 'driver/views/job.html',
    controller: 'jobController'
   }
  },
  onEnter: function(authFact) {
   authFact.Authenticate();
  }
 }).state('root.profile', {
  url: '/profile',
  views: {
   'container@': {
    templateUrl: 'driver/views/profile.html',
    controller: 'profileController'
   }
  },
  onEnter: function(authFact) {
   authFact.profileAuthenticate();
  }
 }).state('root.logout', {
  url: '/logout',
  views: {
   'container@': {
    controller: 'logoutController'
   }
  }
 });
}]).controller('dashboardController', ['$scope', '$mdBottomSheet', '$mdSidenav', 'API_URL', 'authService', 'authFact', '$firebaseArray', '$timeout', '$firebaseObject', '$mdToast', function($scope, $mdBottomSheet, $mdSidenav, API_URL, authService, authFact, $firebaseArray, $timeout, $firebaseObject, $mdToast) {
 var messaging = firebase.messaging();
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 };
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 };
 messaging.requestPermission().then(function() {
  messaging.getToken().then(function(currentToken) {
   sendTokenToServer(currentToken);
  }).catch(function(err) {
   setTokenSentToServer(false);
  });
 }).catch(function(err) {});
 messaging.onTokenRefresh(function() {
  messaging.getToken().then(function(refreshedToken) {
   setTokenSentToServer(false);
   sendTokenToServer(refreshedToken);
  }).catch(function(err) {});
 });
 $scope.toggleSidenav = function(menuId) {
  $mdSidenav(menuId).toggle();
 };

 function deleteToken() {
  messaging.getToken().then(function(currentToken) {
   messaging.deleteToken(currentToken).then(function() {
    messaging.getToken().then(function(refreshedToken) {
     setTokenSentToServer(false);
     sendTokenToServer(refreshedToken);
    }).catch(function(err) {});
   }).catch(function(err) {});
  }).catch(function(err) {});
 }

 function sendTokenToServer(currentToken) {
  if (!isTokenSentToServer()) {
   fetch(API_URL + 'devices/', {
    method: "POST",
    headers: {
     'Content-Type': 'application/json'
    },
    body: JSON.stringify({
     'registration_id': currentToken,
     'type': 'web',
    }),
    credentials: true,
   }).then(function(response) {
    var payload = {
     uid: authFact.getUserId(),
     fcm: currentToken
    }
    authService.fcm(payload).then(function(data) {
     setTokenSentToServer(true);
    });
   })
  } else {
   var payload = {
    uid: authFact.getUserId(),
    fcm: currentToken
   }
   authService.checkFCM(payload).then(function(resp) {
    var result = resp.data.result;
    if (!result || !authFact.isAuthenticated()) {
     deleteToken();
    }
   });
  }
 }

 function isTokenSentToServer() {
  return window.localStorage.getItem('sentToServer') == 1;
 }

 function setTokenSentToServer(sent) {
  window.localStorage.setItem('sentToServer', sent ? 1 : 0);
 }
 $scope.alert = '';
 $scope.showListBottomSheet = function() {
  $scope.alert = '';
  $mdBottomSheet.show({
   template: '<md-bottom-sheet class="md-list md-has-header"><md-list ng-cloak> <md-list-item ng-repeat="item in items"> <span class="md-inline-list-icon-label">{{ item.name }}</span> </md-button></md-list-item> </md-list></md-bottom-sheet>',
   controller: 'ListBottomSheetCtrl'
  }).then(function(clickedItem) {
   $scope.alert = clickedItem['name'] + ' clicked!';
  }).catch(function(error) {});
 };
 var uid = authFact.getUserId();
 var bref = firebase.database().ref().child('drivers').child(uid).child('bids');
 $scope.bids = $firebaseArray(bref);
 $scope.bidList = $scope.bids;
 var ref = firebase.database().ref().child('drivers').child(uid).child('requests');
 $scope.requests = $firebaseArray(ref);
 var jref = firebase.database().ref().child('drivers').child(uid).child('jobs');
 $scope.jobs = $firebaseArray(jref);
 $scope.jobList = $scope.jobs;
 $scope.listlimit = 5;
 $scope.listlimitbid = 5;
 $scope.listlimitjob = 5;
 $scope.jobbadge = 0;
 $scope.badge = 0;
 $scope.myList = [];
 $scope.requests.$loaded().then(function() {
  $scope.myList = $scope.requests;
  angular.forEach($scope.requests, function(value, key) {
   if (!value.seen)
    $scope.badge += 1;
  });
  $scope.requests.$watch(function(event) {
   $scope.badge += 1;
  });
 });
 $scope.jobs.$loaded().then(function() {
  angular.forEach($scope.jobs, function(value, key) {
   if (!value.seen)
    $scope.jobbadge += 1;
  });
  $scope.jobs.$watch(function(event) {
   $scope.jobbadge += 1;
  });
 });

 function convertUTCDateToLocalDate(date) {
  var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  var offset = date.getTimezoneOffset() / 60;
  var hours = date.getHours();
  newDate.setHours(hours - offset);
  return newDate;
 }
 var upList = [];
 var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('requests');
 var obj = $firebaseObject(ref);
 var unwatch = obj.$watch(function() {
  $timeout(function() {
   for (var i = 0; i < $scope.myList.length; i++) {
    var dt = $scope.myList[i].timestamp;
    if (dt) {
     var date = convertUTCDateToLocalDate(new Date(dt));
     var myDate = new Date(date.getTime() + 15 * 60000);
     $('#' + $scope.myList[i].$id).countdown(myDate).on('update.countdown', function(event) {
      $(this).html(event.strftime('%M:%S'));
      var eid = $(this).attr('id');
      var found = true;
      for (var i = 0; i < upList.length; i++) {
       if (upList[i] == eid) {
        found = false;
       }
      }
      if (found) {
       upList.push(eid);
      }
     }).on('finish.countdown', function(event) {
      var myid = $(this).attr('id');
      var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('requests').child(myid);
      var obj = $firebaseObject(ref);
      obj.$loaded().then(function() {
       var temp = obj.BookingId;
       obj.$remove().then(function(ref) {
        $scope.badge = 0;
        for (var i = 0; i < upList.length; i++) {
         if (upList[i] === myid) {
          $scope.showToast('Request id ' + temp + ' is expired!');
          upList.splice(i, 1);
          break;
         }
        }
       }, function(error) {
        console.log("Error:", error);
       });
      });
     });
    }
   }
  }, 200);
 });
 $scope.reCounter = function() {
  for (var i = 0; i < $scope.myList.length; i++) {
   var dt = $scope.myList[i].timestamp;
   if (dt) {
    var date = convertUTCDateToLocalDate(new Date(dt));
    var myDate = new Date(date.getTime() + 15 * 60000);
    $('#' + $scope.myList[i].$id).countdown(myDate).on('update.countdown', function(event) {
     $(this).html(event.strftime('%M:%S'));
     var eid = $(this).attr('id');
     var found = true;
     for (var i = 0; i < upList.length; i++) {
      if (upList[i] == eid) {
       found = false;
      }
     }
     if (found) {
      upList.push(eid);
     }
    }).on('finish.countdown', function(event) {
     var myid = $(this).attr('id');
     var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('requests').child(myid);
     var obj = $firebaseObject(ref);
     obj.$loaded().then(function() {
      var temp = obj.BookingId;
      obj.$remove().then(function(ref) {
       $scope.badge = 0;
       for (var i = 0; i < upList.length; i++) {
        if (upList[i] === myid) {
         $scope.showToast('Request id ' + temp + ' is deleted!');
         upList.splice(i, 1);
         break;
        }
       }
      }, function(error) {
       console.log("Error:", error);
      });
     });
    });
   }
  }
 };
 var bidupList = [];
 var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('bids');
 var obj = $firebaseObject(ref);
 var unwatch = obj.$watch(function() {
  $timeout(function() {
   for (var i = 0; i < $scope.bidList.length; i++) {
    var dt = $scope.bidList[i].timestamp;
    if (dt) {
     var date = convertUTCDateToLocalDate(new Date(dt));
     var myDate = new Date(date.getTime() + 15 * 60000);
     $('#' + $scope.bidList[i].$id).countdown(myDate).on('update.countdown', function(event) {
      $(this).html(event.strftime('%M:%S'));
      var eid = $(this).attr('id');
      var found = true;
      for (var i = 0; i < bidupList.length; i++) {
       if (bidupList[i] == eid) {
        found = false;
       }
      }
      if (found) {
       bidupList.push(eid);
      }
     }).on('finish.countdown', function(event) {
      var myid = $(this).attr('id');
      var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('bids').child(myid);
      var obj = $firebaseObject(ref);
      obj.$loaded().then(function() {
       var temp = obj.BookingId;
       obj.$remove().then(function(ref) {
        for (var i = 0; i < bidupList.length; i++) {
         if (bidupList[i] === myid) {
          $scope.showToast('Bid id ' + temp + ' is expired!');
          bidupList.splice(i, 1);
          break;
         }
        }
       }, function(error) {
        console.log("Error:", error);
       });
      });
     });
    }
   }
  }, 200);
 });
 $scope.bidreCounter = function() {
  for (var i = 0; i < $scope.bidList.length; i++) {
   var dt = $scope.bidList[i].timestamp;
   if (dt) {
    var date = convertUTCDateToLocalDate(new Date(dt));
    var myDate = new Date(date.getTime() + 15 * 60000);
    $('#' + $scope.bidList[i].$id).countdown(myDate).on('update.countdown', function(event) {
     $(this).html(event.strftime('%M:%S'));
     var eid = $(this).attr('id');
     var found = true;
     for (var i = 0; i < bidupList.length; i++) {
      if (bidupList[i] == eid) {
       found = false;
      }
     }
     if (found) {
      bidupList.push(eid);
     }
    }).on('finish.countdown', function(event) {
     var myid = $(this).attr('id');
     var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('bids').child(myid);
     var obj = $firebaseObject(ref);
     obj.$loaded().then(function() {
      var temp = obj.BookingId;
      obj.$remove().then(function(ref) {
       for (var i = 0; i < bidupList.length; i++) {
        if (bidupList[i] === myid) {
         $scope.showToast('Bid id ' + temp + ' is expired!');
         bidupList.splice(i, 1);
         break;
        }
       }
      }, function(error) {
       console.log("Error:", error);
      });
     });
    });
   }
  }
 };
 var jobupList = [];
 var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('jobs');
 var obj = $firebaseObject(ref);
 var unwatch = obj.$watch(function() {
  $timeout(function() {
   for (var i = 0; i < $scope.jobList.length; i++) {
    if ($scope.jobList[i].status === 'Confirming') {
     var dt = $scope.jobList[i].timestamp;
     if (dt) {
      var date = convertUTCDateToLocalDate(new Date(dt));
      var myDate = new Date(date.getTime() + 15 * 60000);
      $('#' + $scope.jobList[i].$id).countdown(myDate).on('update.countdown', function(event) {
       $(this).html(event.strftime('%M:%S'));
       var eid = $(this).attr('id');
       var found = true;
       for (var i = 0; i < jobupList.length; i++) {
        if (jobupList[i] == eid) {
         found = false;
        }
       }
       if (found) {
        jobupList.push(eid);
       }
      }).on('finish.countdown', function(event) {
       var myid = $(this).attr('id');
       var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('jobs').child(myid);
       var obj = $firebaseObject(ref);
       obj.$loaded().then(function() {
        var temp = obj.BookingId;
        obj.$remove().then(function(ref) {
         $scope.jobbadge = 0;
         for (var i = 0; i < jobupList.length; i++) {
          if (jobupList[i] === myid) {
           $scope.showToast('Job with id ' + temp + ' is expired!');
           jobupList.splice(i, 1);
           break;
          }
         }
        }, function(error) {
         console.log("Error:", error);
        });
       });
      });
     }
    }
   }
  }, 200);
 });
 $scope.jobreCounter = function() {
  for (var i = 0; i < $scope.jobList.length; i++) {
   if ($scope.jobList[i].status === 'Confirming') {
    var dt = $scope.jobList[i].timestamp;
    if (dt) {
     var date = convertUTCDateToLocalDate(new Date(dt));
     var myDate = new Date(date.getTime() + 15 * 60000);
     $('#' + $scope.jobList[i].$id).countdown(myDate).on('update.countdown', function(event) {
      $(this).html(event.strftime('%M:%S'));
      var eid = $(this).attr('id');
      var found = true;
      for (var i = 0; i < jobupList.length; i++) {
       if (jobupList[i] == eid) {
        found = false;
       }
      }
      if (found) {
       jobupList.push(eid);
      }
     }).on('finish.countdown', function(event) {
      var myid = $(this).attr('id');
      var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('jobs').child(myid);
      var obj = $firebaseObject(ref);
      obj.$loaded().then(function() {
       var temp = obj.BookingId;
       $scope.jobbadge = 0;
       obj.$remove().then(function(ref) {
        for (var i = 0; i < jobupList.length; i++) {
         if (jobupList[i] === myid) {
          $scope.showToast('Job with id ' + temp + ' is expired!');
          jobupList.splice(i, 1);
          break;
         }
        }
       }, function(error) {
        console.log("Error:", error);
       });
      });
     });
    }
   }
  }
 };
 $scope.loadmore = function() {
  $scope.listlimit += 5;
 }
 $scope.loadmorebid = function() {
  $scope.listlimitbid += 5;
 }
 $scope.loadmorejob = function() {
  $scope.listlimitjob += 5;
 }
}]).controller('ListBottomSheetCtrl', function($scope, $mdBottomSheet) {
 $scope.items = [{
  name: 'Share',
  icon: 'share-arrow'
 }, {
  name: 'About',
  icon: 'upload'
 }];
 $scope.listItemClick = function($index) {
  var clickedItem = $scope.items[$index];
  $mdBottomSheet.hide(clickedItem);
 };
}).controller('loginController', ['$scope', '$state', '$firebaseAuth', 'authService', 'authFact', '$mdSidenav', '$firebaseObject', '$mdToast', function($scope, $state, $firebaseAuth, authService, authFact, $mdSidenav, $firebaseObject, $mdToast) {
 $scope.auth = $firebaseAuth();
 $scope.loginSubmit = function() {
  $scope.auth.$signInWithEmailAndPassword($scope.myemail, $scope.password).then(function(resp) {
   if (authFact.getInfo(resp.uid)) {
    authFact.buildCookies(resp);
    authFact.saveInfo('profile', true);
    $state.go('root.dashboard', {}, {
     reload: true
    });
   } else {
    var ref = firebase.database().ref().child('drivers').child(resp.uid).child('profile');
    var obj = $firebaseObject(ref);
    authFact.buildCookies(resp);
    obj.$loaded().then(function() {
     if (obj.phone_number && obj.name) {
      authFact.saveInfo('profile', true);
      authFact.saveConstants(resp.uid, true);
      $state.go('root.dashboard', {}, {
       reload: true
      });
     } else {
      $state.go('root.profile', {}, {
       reload: true
      });
     }
    });
   }
  }).catch(function(error) {
   $scope.showToast(error.message);
  });
 };
 $scope.social_authentication = function(provider) {
  $scope.auth.$signInWithPopup(provider).then(function(result) {
   var resp = authFact.getInfo(result.user.uid);
   if (resp) {
    authFact.buildCookies(result.user);
    authFact.saveInfo('profile', true);
    $state.go('root.dashboard', {}, {
     reload: true
    });
   } else {
    authFact.buildCookies(result.user);
    var ref = firebase.database().ref().child('drivers').child(result.user.uid).child('profile');
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     if (obj.phone_number && obj.name) {
      authFact.saveInfo('profile', true);
      authFact.saveConstants(result.user.uid, true);
      $state.go('root.dashboard', {}, {
       reload: true
      });
     } else {
      $state.go('root.profile', {}, {
       reload: true
      });
     }
    });
   }
  }).catch(function(error) {
   $scope.showToast(error.message);
  });
 };
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 };
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 };
}]).controller('registerController', ['$scope', '$state', 'authService', 'authFact', '$mdSidenav', '$mdToast', function($scope, $state, authService, authFact, $mdSidenav, $mdToast) {
 $scope.registerSubmit = function() {
  var payload = {
   email: $scope.email,
   password1: $scope.password,
  }
  authService.register(payload).then(function(data) {
   if (data.data.errors) {
    var errors = data.data.errors;
    if (errors['email']) {
     $scope.showToast(errors['email'][0]);
    }
   } else {
    authFact.buildCookies(data.data);
    $state.go('root.profile', {}, {
     reload: true
    });
   }
  })
 };
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 };
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 }
}]).controller('logoutController', ['$scope', 'authFact', '$state', function($scope, authFact, $state) {
 authFact.destroyCookies();
 $state.go('root.login', {}, {
  reload: true
 });
}]).controller('requestController', ['$scope', 'authFact', '$state', '$stateParams', '$mdSidenav', '$firebaseArray', '$mdDialog', '$timeout', '$mdToast', '$firebaseObject', 'APP_URL', '$http', 'reverseGeocode', '$cookies', function($scope, authFact, $state, $stateParams, $mdSidenav, $firebaseArray, $mdDialog, $timeout, $mdToast, $firebaseObject, APP_URL, $http, reverseGeocode, $cookies) {
 $scope.toggleSidenav = function(menuId) {
  $mdSidenav(menuId).toggle();
 };
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 };
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 };
 var uid = authFact.getUserId();
 var ref = firebase.database().ref().child('drivers').child(uid).child('requests');
 var list = $firebaseArray(ref);
 list.$loaded().then(function(x) {
  $scope.request = x.$getRecord($stateParams['id']);
  $http.get(APP_URL + 'booking/' + $scope.request.BookingId + '/').then(function(resp) {
   if (!resp.data.result) {
    var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('requests').child($scope.request.$id);
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     var temp = obj.BookingId;
     obj.$remove().then(function(ref) {
      $scope.showToast('This Request for booking with id ' + temp + ' is cancelled by client!');
      $state.go('root.dashboard', {}, {
       reload: true
      });
     }, function(error) {
      console.log("Error:", error);
     });
    });
   }
  });
  var index = list.$indexFor($stateParams['id']);
  list[index].seen = true;
  list.$save(index).then(function(ref) {
   $scope.getDirections();
  });
 }).catch(function(error) {});

 function convertUTCDateToLocalDate(date) {
  var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  var offset = date.getTimezoneOffset() / 60;
  var hours = date.getHours();
  newDate.setHours(hours - offset);
  return newDate;
 }
 $timeout(function() {
  var dt = $scope.request.timestamp;
  if (dt) {
   var date = convertUTCDateToLocalDate(new Date(dt));
   var myDate = new Date(date.getTime() + 15 * 60000);
   $('#' + $scope.request.$id).countdown(myDate).on('update.countdown', function(event) {
    $(this).html(event.strftime('%M:%S'));
   }).on('finish.countdown', function(event) {
    var myid = $(this).attr('id');
    var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('requests').child(myid);
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     var temp = obj.BookingId;
     obj.$remove().then(function(ref) {
      $scope.showToast('Request id ' + temp + ' is expired!');
      $state.go('root.dashboard', {}, {
       reload: true
      });
     }, function(error) {
      console.log("Error:", error);
     });
    });
   });
  }
 }, 500);
 $scope.map = {
  control: {},
  center: {
   latitude: 23.4162,
   longitude: 25.6228
  },
  zoom: 5
 };
 var directionsDisplay = new google.maps.DirectionsRenderer();
 var directionsService = new google.maps.DirectionsService();
 var geocoder = new google.maps.Geocoder();
 $scope.getDirections = function() {
  $scope.directions = {
   origin: $scope.request.Pickup,
   destination: $scope.request.Destination,
   showList: false
  }
  var request = {
   origin: $scope.directions.origin,
   destination: $scope.directions.destination,
   travelMode: google.maps.DirectionsTravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
   if (status === google.maps.DirectionsStatus.OK) {
    directionsDisplay.setDirections(response);
    directionsDisplay.setMap($scope.map.control.getGMap());
    $scope.distance = response.routes[0].legs[0].distance.text;
    $scope.duration = response.routes[0].legs[0].duration.text;
    $scope.$watch(function() {
     return $cookies.get('location');
    }, function(newValue) {
     var obj = JSON.parse(newValue);
     reverseGeocode.geocodePosition(obj.lat, obj.lng, function(address) {
      $scope.marker = {
       id: 0,
       coords: {
        latitude: obj.lat,
        longitude: obj.lng
       },
       window: {
        title: address,
       }
      }
      $scope.$apply();
     });
    });
   } else {
    $timeout(function() {
     $scope.getDirections();
    }, 1500);
   }
  });
 };
 $scope.showAdd = function(ev) {
  var confirm = $mdDialog.prompt().title('Quote ?').placeholder('Your quote').ariaLabel('Quote').targetEvent(ev).ok('Send').cancel('Cancel');
  $mdDialog.show(confirm).then(function(result) {
   var myref = firebase.database().ref().child('quotes').child($scope.request.BookingId).child('drivers');
   var mylist = $firebaseArray(myref);
   mylist.$add({
    quote: result,
    driver: uid,
    BookingId: $scope.request.BookingId
   }).then(function(ref) {
    var dref = firebase.database().ref().child('drivers').child(uid).child('bids');
    var dlist = $firebaseArray(dref);
    dlist.$add({
     Pickup: $scope.request.Pickup,
     Destination: $scope.request.Destination,
     status: 'Waiting',
     quote: result,
     BookingId: $scope.request.BookingId,
     timestamp: $scope.request.timestamp
    }).then(function(ref) {
     var qref = firebase.database().ref().child('drivers').child(uid).child('requests');
     var qlist = $firebaseArray(qref);
     qlist.$loaded().then(function(x) {
      var ind = x.$indexFor($stateParams['id']);
      x.$remove(ind).then(function(ref) {
       $state.go('root.dashboard', {}, {
        reload: true
       });
      });
     });
    });
   }, function() {});
  });
 };
}]).controller('bidController', ['$scope', 'authFact', '$state', '$stateParams', '$mdSidenav', '$firebaseArray', '$mdDialog', '$timeout', '$mdToast', '$firebaseObject', 'APP_URL', '$http', 'reverseGeocode', '$cookies', function($scope, authFact, $state, $stateParams, $mdSidenav, $firebaseArray, $mdDialog, $timeout, $mdToast, $firebaseObject, APP_URL, $http, reverseGeocode, $cookies) {
 $scope.toggleSidenav = function(menuId) {
  $mdSidenav(menuId).toggle();
 };
 var uid = authFact.getUserId();
 var ref = firebase.database().ref().child('drivers').child(uid).child('bids');
 var list = $firebaseArray(ref);
 list.$loaded().then(function(x) {
  $scope.bid = x.$getRecord($stateParams['id']);
  $http.get(APP_URL + 'booking/' + $scope.bid.BookingId + '/').then(function(resp) {
   if (!resp.data.result) {
    var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('bids').child($scope.bid.$id);
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     var temp = obj.BookingId;
     obj.$remove().then(function(ref) {
      $scope.showToast('Your bid for booking with id ' + temp + ' is cancelled by client!');
      $state.go('root.dashboard', {}, {
       reload: true
      });
     }, function(error) {
      console.log("Error:", error);
     });
    });
   }
  });
  $scope.getDirections();
 }).catch(function(error) {});
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 }
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 };

 function convertUTCDateToLocalDate(date) {
  var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  var offset = date.getTimezoneOffset() / 60;
  var hours = date.getHours();
  newDate.setHours(hours - offset);
  return newDate;
 }
 $timeout(function() {
  var dt = $scope.bid.timestamp;
  if (dt) {
   var date = convertUTCDateToLocalDate(new Date(dt));
   var myDate = new Date(date.getTime() + 15 * 60000);
   $('#' + $scope.bid.$id).countdown(myDate).on('update.countdown', function(event) {
    $(this).html(event.strftime('%M:%S'));
   }).on('finish.countdown', function(event) {
    var myid = $(this).attr('id');
    var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('bids').child(myid);
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     var temp = obj.BookingId;
     obj.$remove().then(function(ref) {
      $scope.showToast('Bid id ' + temp + ' is expired!');
      $state.go('root.dashboard', {}, {
       reload: true
      });
     }, function(error) {
      console.log("Error:", error);
     });
    });
   });
  }
 }, 1000);
 $scope.map = {
  control: {},
  center: {
   latitude: 23.4162,
   longitude: 25.6228
  },
  zoom: 5
 };
 var directionsDisplay = new google.maps.DirectionsRenderer();
 var directionsService = new google.maps.DirectionsService();
 var geocoder = new google.maps.Geocoder();
 $scope.getDirections = function() {
  $scope.directions = {
   origin: $scope.bid.Pickup,
   destination: $scope.bid.Destination,
  }
  var request = {
   origin: $scope.directions.origin,
   destination: $scope.directions.destination,
   travelMode: google.maps.DirectionsTravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
   if (status === google.maps.DirectionsStatus.OK) {
    directionsDisplay.setDirections(response);
    directionsDisplay.setMap($scope.map.control.getGMap());
    $scope.distance = response.routes[0].legs[0].distance.text;
    $scope.duration = response.routes[0].legs[0].duration.text;
    $scope.$watch(function() {
     return $cookies.get('location');
    }, function(newValue) {
     var obj = JSON.parse(newValue);
     reverseGeocode.geocodePosition(obj.lat, obj.lng, function(address) {
      $scope.marker = {
       id: 0,
       coords: {
        latitude: obj.lat,
        longitude: obj.lng
       },
       window: {
        title: address,
       }
      }
      $scope.$apply();
     });
    });
   } else {
    $timeout(function() {
     $scope.getDirections();
    }, 1500);
   }
  });
 };
}]).controller('jobController', ['$scope', 'authFact', '$state', '$stateParams', '$mdSidenav', '$firebaseArray', '$mdDialog', '$timeout', '$mdToast', '$firebaseObject', 'APP_URL', '$http', 'reverseGeocode', '$cookies', function($scope, authFact, $state, $stateParams, $mdSidenav, $firebaseArray, $mdDialog, $timeout, $mdToast, $firebaseObject, APP_URL, $http, reverseGeocode, $cookies) {
 $scope.toggleSidenav = function(menuId) {
  $mdSidenav(menuId).toggle();
 };
 var uid = authFact.getUserId();
 var ref = firebase.database().ref().child('drivers').child(uid).child('jobs');
 var list = $firebaseArray(ref);
 list.$loaded().then(function(x) {
  $scope.job = x.$getRecord($stateParams['id']);
  $http.get(APP_URL + 'booking/confirm/' + $scope.job.BookingId + '/').then(function(resp) {
   if (!resp.data.result) {
    var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('jobs').child($scope.job.$id);
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     var temp = obj.BookingId;
     obj.$remove().then(function(ref) {
      $scope.showToast('This Booking with id ' + temp + ' is already cancelled by client!');
      $state.go('root.dashboard', {}, {
       reload: true
      });
     }, function(error) {
      console.log("Error:", error);
     });
    });
   }
  });
  var index = list.$indexFor($stateParams['id']);
  list[index].seen = true;
  list.$save(index).then(function(ref) {
   $scope.getDirections();
  });
 }).catch(function(error) {});
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 }
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 };

 function convertUTCDateToLocalDate(date) {
  var newDate = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
  var offset = date.getTimezoneOffset() / 60;
  var hours = date.getHours();
  newDate.setHours(hours - offset);
  return newDate;
 };
 $timeout(function() {
  if ($scope.job.status == 'Confirming') {
   var dt = $scope.job.timestamp;
   if (dt) {
    var date = convertUTCDateToLocalDate(new Date(dt));
    var myDate = new Date(date.getTime() + 15 * 60000);
    $('#' + $scope.job.$id).countdown(myDate).on('update.countdown', function(event) {
     $(this).html('Expires in : ' + event.strftime('%M:%S'));
    }).on('finish.countdown', function(event) {
     var myid = $(this).attr('id');
     var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('jobs').child(myid);
     var obj = $firebaseObject(ref);
     obj.$loaded().then(function() {
      var temp = obj.BookingId;
      obj.$remove().then(function(ref) {
       $scope.showToast('Booking with id ' + temp + ' is expired!');
       $state.go('root.dashboard', {}, {
        reload: true
       });
      }, function(error) {
       console.log("Error:", error);
      });
     });
    });
   }
  }
 }, 500);
 $scope.onChange = function(state) {
  $http.get(APP_URL + 'booking/accept/' + $scope.job.BookingId + '/').then(function(resp) {
   if (resp.data.result) {
    var ref = firebase.database().ref().child('drivers').child(authFact.getUserId()).child('jobs').child($scope.job.$id);
    var obj = $firebaseObject(ref);
    obj.$loaded().then(function() {
     obj.status = "Onway";
     obj.$save().then(function(ref) {
      $('#' + $scope.job.$id).countdown('stop');
     }, function(error) {
      console.log("Error:", error);
     });
    });
   }
  });
 };
 $scope.map = {
  control: {},
  center: {
   latitude: 23.4162,
   longitude: 25.6228
  },
  zoom: 5
 };
 var directionsDisplay = new google.maps.DirectionsRenderer();
 var directionsService = new google.maps.DirectionsService();
 var geocoder = new google.maps.Geocoder();
 $scope.getDirections = function() {
  $scope.directions = {
   origin: $scope.job.Pickup,
   destination: $scope.job.Destination,
  }
  var request = {
   origin: $scope.directions.origin,
   destination: $scope.directions.destination,
   travelMode: google.maps.DirectionsTravelMode.DRIVING
  };
  directionsService.route(request, function(response, status) {
   if (status === google.maps.DirectionsStatus.OK) {
    directionsDisplay.setDirections(response);
    directionsDisplay.setMap($scope.map.control.getGMap());
    $scope.distance = response.routes[0].legs[0].distance.text;
    $scope.duration = response.routes[0].legs[0].duration.text;
    $scope.$watch(function() {
     return $cookies.get('location');
    }, function(newValue) {
     var obj = JSON.parse(newValue);
     reverseGeocode.geocodePosition(obj.lat, obj.lng, function(address) {
      $scope.marker = {
       id: 0,
       coords: {
        latitude: obj.lat,
        longitude: obj.lng
       },
       window: {
        title: address,
       }
      }
      $scope.$apply();
     });
    });
   } else {
    $timeout(function() {
     $scope.getDirections();
    }, 1500);
   }
  });
 };
}]).controller('profileController', ['$scope', '$mdSidenav', '$mdDialog', 'authFact', '$firebaseObject', 'authService', '$state', function($scope, $mdSidenav, $mdDialog, authFact, $firebaseObject, authService, $state) {
 $scope.toggleSidenav = function(menuId) {
  $mdSidenav(menuId).toggle();
 };
 $scope.showConfirm = function(ev) {
  var confirm = $mdDialog.confirm().title('Profile Confirmation').textContent('Do you want to save this profile information ?').ariaLabel('Profile Save').targetEvent(ev).ok('Save').cancel('Retry');
  $mdDialog.show(confirm).then(function() {
   authFact.saveInfo('profile', true);
   var payload = {
    name: $scope.name,
    email: authFact.getUserEmail(),
    firebaseId: authFact.getUserId(),
    phone_number: $scope.phone_number,
    category: $scope.category,
    language: $scope.language
   }
   authService.profile(payload).then(function(data) {
    if (data.data.errors) {
     var errors = data.data.errors;
     if (errors['email']) {
      $scope.showToast(errors['email'][0]);
     }
    } else {
     $scope.edit = true;
     $state.go('root.dashboard', {}, {
      reload: true
     });
    }
   })
  }, function() {
   $scope.getName();
  });
 };
 var last = {
  bottom: false,
  top: true,
  left: false,
  right: true
 };
 var toastPosition = angular.extend({}, last);

 function getToastPosition() {
  return Object.keys(toastPosition).filter(function(pos) {
   return toastPosition[pos];
  }).join(' ');
 };
 $scope.showToast = function(msg) {
  var pinTo = getToastPosition();
  var toast = $mdToast.simple().textContent(msg).action('OK').position(pinTo).highlightAction(false);
  $mdToast.show(toast).then(function(response) {});
 };
 $scope.getLanguage = function(ev) {
  $mdDialog.show({
   controller: DialogController,
   scope: $scope.$new(),
   templateUrl: 'driver/views/profileDialogs/language.tmpl.html',
   parent: angular.element(document.body),
   targetEvent: ev,
   openFrom: '#left',
   closeTo: '#right'
  }).then(function(value) {
   $scope.language = value;
   $scope.showConfirm();
  }, function() {});
 };
 $scope.getCategory = function(ev) {
  $mdDialog.show({
   controller: DialogController,
   scope: $scope.$new(),
   templateUrl: 'driver/views/profileDialogs/category.tmpl.html',
   parent: angular.element(document.body),
   targetEvent: ev,
   openFrom: '#left',
   closeTo: '#right'
  }).then(function(value) {
   $scope.category = value;
   $scope.getLanguage();
  }, function() {});
 };
 $scope.getPhoneNumber = function(ev) {
  $mdDialog.show({
   controller: DialogController,
   scope: $scope.$new(),
   templateUrl: 'driver/views/profileDialogs/phone.tmpl.html',
   parent: angular.element(document.body),
   targetEvent: ev,
   openFrom: '#left',
   closeTo: '#right'
  }).then(function(value) {
   $scope.phone_number = value;
   $scope.getCategory();
  }, function() {});
 };
 $scope.getName = function(ev) {
  $mdDialog.show({
   controller: DialogController,
   scope: $scope.$new(),
   templateUrl: 'driver/views/profileDialogs/first.tmpl.html',
   parent: angular.element(document.body),
   targetEvent: ev,
   openFrom: '#left',
   closeTo: '#right'
  }).then(function(val) {
   $scope.name = val;
   $scope.getPhoneNumber();
  }, function() {});
 };
 $scope.photo = authFact.getUserPhoto();
 $scope.email = authFact.getUserEmail();
 if ($scope.photo == 'null' || $scope.photo == null) {
  $scope.perm = true;
  $scope.vari = 'inset';
  $scope.photo = '/components/images/mytaxi.png';
 }
 if (authFact.getProfile()) {
  var uid = authFact.getUserId();
  var ref = firebase.database().ref().child('drivers').child(uid);
  var obj = $firebaseObject(ref);
  obj.$loaded().then(function() {
   $scope.email = obj.profile.email;
   $scope.phone_number = obj.profile.phone_number;
   $scope.name = obj.profile.name;
   $scope.language = obj.profile.language;
   $scope.category = obj.profile.category;
   $scope.country = obj.location.country;
   $scope.city = obj.location.area_level2 ? obj.location.area_level2 : obj.location.area_level1;
   if ($scope.phone_number) {
    $scope.edit = true;
   }
  });
 } else {
  $scope.loc = true;
  $scope.getName();
 }
}]);

function DialogController($scope, $mdDialog) {
 $scope.phoneNumbr = /^\+?\d{2}[- ]?\d{3}[- ]?\d{5,7}$/;
 $scope.types = [{
  "name": "Petit Taxi"
 }, {
  "name": "Grand Taxi"
 }, ]
 $scope.languages = [{
  "code": "ab",
  "name": "Abkhaz",
  "nativeName": "аҧсуа"
 }, {
  "code": "aa",
  "name": "Afar",
  "nativeName": "Afaraf"
 }, {
  "code": "af",
  "name": "Afrikaans",
  "nativeName": "Afrikaans"
 }, {
  "code": "ak",
  "name": "Akan",
  "nativeName": "Akan"
 }, {
  "code": "sq",
  "name": "Albanian",
  "nativeName": "Shqip"
 }, {
  "code": "am",
  "name": "Amharic",
  "nativeName": "አማርኛ"
 }, {
  "code": "ar",
  "name": "Arabic",
  "nativeName": "العربية"
 }, {
  "code": "an",
  "name": "Aragonese",
  "nativeName": "Aragonés"
 }, {
  "code": "hy",
  "name": "Armenian",
  "nativeName": "Հայերեն"
 }, {
  "code": "as",
  "name": "Assamese",
  "nativeName": "অসমীয়া"
 }, {
  "code": "av",
  "name": "Avaric",
  "nativeName": "авар мацӀ, магӀарул мацӀ"
 }, {
  "code": "ae",
  "name": "Avestan",
  "nativeName": "avesta"
 }, {
  "code": "ay",
  "name": "Aymara",
  "nativeName": "aymar aru"
 }, {
  "code": "az",
  "name": "Azerbaijani",
  "nativeName": "azərbaycan dili"
 }, {
  "code": "bm",
  "name": "Bambara",
  "nativeName": "bamanankan"
 }, {
  "code": "ba",
  "name": "Bashkir",
  "nativeName": "башҡорт теле"
 }, {
  "code": "eu",
  "name": "Basque",
  "nativeName": "euskara, euskera"
 }, {
  "code": "be",
  "name": "Belarusian",
  "nativeName": "Беларуская"
 }, {
  "code": "bn",
  "name": "Bengali",
  "nativeName": "বাংলা"
 }, {
  "code": "bh",
  "name": "Bihari",
  "nativeName": "भोजपुरी"
 }, {
  "code": "bi",
  "name": "Bislama",
  "nativeName": "Bislama"
 }, {
  "code": "bs",
  "name": "Bosnian",
  "nativeName": "bosanski jezik"
 }, {
  "code": "br",
  "name": "Breton",
  "nativeName": "brezhoneg"
 }, {
  "code": "bg",
  "name": "Bulgarian",
  "nativeName": "български език"
 }, {
  "code": "my",
  "name": "Burmese",
  "nativeName": "ဗမာစာ"
 }, {
  "code": "ca",
  "name": "Catalan; Valencian",
  "nativeName": "Català"
 }, {
  "code": "ch",
  "name": "Chamorro",
  "nativeName": "Chamoru"
 }, {
  "code": "ce",
  "name": "Chechen",
  "nativeName": "нохчийн мотт"
 }, {
  "code": "ny",
  "name": "Chichewa; Chewa; Nyanja",
  "nativeName": "chiCheŵa, chinyanja"
 }, {
  "code": "zh",
  "name": "Chinese",
  "nativeName": "中文 (Zhōngwén), 汉语, 漢語"
 }, {
  "code": "cv",
  "name": "Chuvash",
  "nativeName": "чӑваш чӗлхи"
 }, {
  "code": "kw",
  "name": "Cornish",
  "nativeName": "Kernewek"
 }, {
  "code": "co",
  "name": "Corsican",
  "nativeName": "corsu, lingua corsa"
 }, {
  "code": "cr",
  "name": "Cree",
  "nativeName": "ᓀᐦᐃᔭᐍᐏᐣ"
 }, {
  "code": "hr",
  "name": "Croatian",
  "nativeName": "hrvatski"
 }, {
  "code": "cs",
  "name": "Czech",
  "nativeName": "česky, čeština"
 }, {
  "code": "da",
  "name": "Danish",
  "nativeName": "dansk"
 }, {
  "code": "dv",
  "name": "Divehi; Dhivehi; Maldivian;",
  "nativeName": "ދިވެހި"
 }, {
  "code": "nl",
  "name": "Dutch",
  "nativeName": "Nederlands, Vlaams"
 }, {
  "code": "en",
  "name": "English",
  "nativeName": "English"
 }, {
  "code": "eo",
  "name": "Esperanto",
  "nativeName": "Esperanto"
 }, {
  "code": "et",
  "name": "Estonian",
  "nativeName": "eesti, eesti keel"
 }, {
  "code": "ee",
  "name": "Ewe",
  "nativeName": "Eʋegbe"
 }, {
  "code": "fo",
  "name": "Faroese",
  "nativeName": "føroyskt"
 }, {
  "code": "fj",
  "name": "Fijian",
  "nativeName": "vosa Vakaviti"
 }, {
  "code": "fi",
  "name": "Finnish",
  "nativeName": "suomi, suomen kieli"
 }, {
  "code": "fr",
  "name": "French",
  "nativeName": "français, langue française"
 }, {
  "code": "ff",
  "name": "Fula; Fulah; Pulaar; Pular",
  "nativeName": "Fulfulde, Pulaar, Pular"
 }, {
  "code": "gl",
  "name": "Galician",
  "nativeName": "Galego"
 }, {
  "code": "ka",
  "name": "Georgian",
  "nativeName": "ქართული"
 }, {
  "code": "de",
  "name": "German",
  "nativeName": "Deutsch"
 }, {
  "code": "el",
  "name": "Greek, Modern",
  "nativeName": "Ελληνικά"
 }, {
  "code": "gn",
  "name": "Guaraní",
  "nativeName": "Avañeẽ"
 }, {
  "code": "gu",
  "name": "Gujarati",
  "nativeName": "ગુજરાતી"
 }, {
  "code": "ht",
  "name": "Haitian; Haitian Creole",
  "nativeName": "Kreyòl ayisyen"
 }, {
  "code": "ha",
  "name": "Hausa",
  "nativeName": "Hausa, هَوُسَ"
 }, {
  "code": "he",
  "name": "Hebrew (modern)",
  "nativeName": "עברית"
 }, {
  "code": "hz",
  "name": "Herero",
  "nativeName": "Otjiherero"
 }, {
  "code": "hi",
  "name": "Hindi",
  "nativeName": "हिन्दी, हिंदी"
 }, {
  "code": "ho",
  "name": "Hiri Motu",
  "nativeName": "Hiri Motu"
 }, {
  "code": "hu",
  "name": "Hungarian",
  "nativeName": "Magyar"
 }, {
  "code": "ia",
  "name": "Interlingua",
  "nativeName": "Interlingua"
 }, {
  "code": "id",
  "name": "Indonesian",
  "nativeName": "Bahasa Indonesia"
 }, {
  "code": "ie",
  "name": "Interlingue",
  "nativeName": "Originally called Occidental; then Interlingue after WWII"
 }, {
  "code": "ga",
  "name": "Irish",
  "nativeName": "Gaeilge"
 }, {
  "code": "ig",
  "name": "Igbo",
  "nativeName": "Asụsụ Igbo"
 }, {
  "code": "ik",
  "name": "Inupiaq",
  "nativeName": "Iñupiaq, Iñupiatun"
 }, {
  "code": "io",
  "name": "Ido",
  "nativeName": "Ido"
 }, {
  "code": "is",
  "name": "Icelandic",
  "nativeName": "Íslenska"
 }, {
  "code": "it",
  "name": "Italian",
  "nativeName": "Italiano"
 }, {
  "code": "iu",
  "name": "Inuktitut",
  "nativeName": "ᐃᓄᒃᑎᑐᑦ"
 }, {
  "code": "ja",
  "name": "Japanese",
  "nativeName": "日本語 (にほんご／にっぽんご)"
 }, {
  "code": "jv",
  "name": "Javanese",
  "nativeName": "basa Jawa"
 }, {
  "code": "kl",
  "name": "Kalaallisut, Greenlandic",
  "nativeName": "kalaallisut, kalaallit oqaasii"
 }, {
  "code": "kn",
  "name": "Kannada",
  "nativeName": "ಕನ್ನಡ"
 }, {
  "code": "kr",
  "name": "Kanuri",
  "nativeName": "Kanuri"
 }, {
  "code": "ks",
  "name": "Kashmiri",
  "nativeName": "कश्मीरी, كشميري‎"
 }, {
  "code": "kk",
  "name": "Kazakh",
  "nativeName": "Қазақ тілі"
 }, {
  "code": "km",
  "name": "Khmer",
  "nativeName": "ភាសាខ្មែរ"
 }, {
  "code": "ki",
  "name": "Kikuyu, Gikuyu",
  "nativeName": "Gĩkũyũ"
 }, {
  "code": "rw",
  "name": "Kinyarwanda",
  "nativeName": "Ikinyarwanda"
 }, {
  "code": "ky",
  "name": "Kirghiz, Kyrgyz",
  "nativeName": "кыргыз тили"
 }, {
  "code": "kv",
  "name": "Komi",
  "nativeName": "коми кыв"
 }, {
  "code": "kg",
  "name": "Kongo",
  "nativeName": "KiKongo"
 }, {
  "code": "ko",
  "name": "Korean",
  "nativeName": "한국어 (韓國語), 조선말 (朝鮮語)"
 }, {
  "code": "ku",
  "name": "Kurdish",
  "nativeName": "Kurdî, كوردی‎"
 }, {
  "code": "kj",
  "name": "Kwanyama, Kuanyama",
  "nativeName": "Kuanyama"
 }, {
  "code": "la",
  "name": "Latin",
  "nativeName": "latine, lingua latina"
 }, {
  "code": "lb",
  "name": "Luxembourgish, Letzeburgesch",
  "nativeName": "Lëtzebuergesch"
 }, {
  "code": "lg",
  "name": "Luganda",
  "nativeName": "Luganda"
 }, {
  "code": "li",
  "name": "Limburgish, Limburgan, Limburger",
  "nativeName": "Limburgs"
 }, {
  "code": "ln",
  "name": "Lingala",
  "nativeName": "Lingála"
 }, {
  "code": "lo",
  "name": "Lao",
  "nativeName": "ພາສາລາວ"
 }, {
  "code": "lt",
  "name": "Lithuanian",
  "nativeName": "lietuvių kalba"
 }, {
  "code": "lu",
  "name": "Luba-Katanga",
  "nativeName": ""
 }, {
  "code": "lv",
  "name": "Latvian",
  "nativeName": "latviešu valoda"
 }, {
  "code": "gv",
  "name": "Manx",
  "nativeName": "Gaelg, Gailck"
 }, {
  "code": "mk",
  "name": "Macedonian",
  "nativeName": "македонски јазик"
 }, {
  "code": "mg",
  "name": "Malagasy",
  "nativeName": "Malagasy fiteny"
 }, {
  "code": "ms",
  "name": "Malay",
  "nativeName": "bahasa Melayu, بهاس ملايو‎"
 }, {
  "code": "ml",
  "name": "Malayalam",
  "nativeName": "മലയാളം"
 }, {
  "code": "mt",
  "name": "Maltese",
  "nativeName": "Malti"
 }, {
  "code": "mi",
  "name": "Māori",
  "nativeName": "te reo Māori"
 }, {
  "code": "mr",
  "name": "Marathi (Marāṭhī)",
  "nativeName": "मराठी"
 }, {
  "code": "mh",
  "name": "Marshallese",
  "nativeName": "Kajin M̧ajeļ"
 }, {
  "code": "mn",
  "name": "Mongolian",
  "nativeName": "монгол"
 }, {
  "code": "na",
  "name": "Nauru",
  "nativeName": "Ekakairũ Naoero"
 }, {
  "code": "nv",
  "name": "Navajo, Navaho",
  "nativeName": "Diné bizaad, Dinékʼehǰí"
 }, {
  "code": "nb",
  "name": "Norwegian Bokmål",
  "nativeName": "Norsk bokmål"
 }, {
  "code": "nd",
  "name": "North Ndebele",
  "nativeName": "isiNdebele"
 }, {
  "code": "ne",
  "name": "Nepali",
  "nativeName": "नेपाली"
 }, {
  "code": "ng",
  "name": "Ndonga",
  "nativeName": "Owambo"
 }, {
  "code": "nn",
  "name": "Norwegian Nynorsk",
  "nativeName": "Norsk nynorsk"
 }, {
  "code": "no",
  "name": "Norwegian",
  "nativeName": "Norsk"
 }, {
  "code": "ii",
  "name": "Nuosu",
  "nativeName": "ꆈꌠ꒿ Nuosuhxop"
 }, {
  "code": "nr",
  "name": "South Ndebele",
  "nativeName": "isiNdebele"
 }, {
  "code": "oc",
  "name": "Occitan",
  "nativeName": "Occitan"
 }, {
  "code": "oj",
  "name": "Ojibwe, Ojibwa",
  "nativeName": "ᐊᓂᔑᓈᐯᒧᐎᓐ"
 }, {
  "code": "cu",
  "name": "Old Church Slavonic, Church Slavic, Church Slavonic, Old Bulgarian, Old Slavonic",
  "nativeName": "ѩзыкъ словѣньскъ"
 }, {
  "code": "om",
  "name": "Oromo",
  "nativeName": "Afaan Oromoo"
 }, {
  "code": "or",
  "name": "Oriya",
  "nativeName": "ଓଡ଼ିଆ"
 }, {
  "code": "os",
  "name": "Ossetian, Ossetic",
  "nativeName": "ирон æвзаг"
 }, {
  "code": "pa",
  "name": "Panjabi, Punjabi",
  "nativeName": "ਪੰਜਾਬੀ, پنجابی‎"
 }, {
  "code": "pi",
  "name": "Pāli",
  "nativeName": "पाऴि"
 }, {
  "code": "fa",
  "name": "Persian",
  "nativeName": "فارسی"
 }, {
  "code": "pl",
  "name": "Polish",
  "nativeName": "polski"
 }, {
  "code": "ps",
  "name": "Pashto, Pushto",
  "nativeName": "پښتو"
 }, {
  "code": "pt",
  "name": "Portuguese",
  "nativeName": "Português"
 }, {
  "code": "qu",
  "name": "Quechua",
  "nativeName": "Runa Simi, Kichwa"
 }, {
  "code": "rm",
  "name": "Romansh",
  "nativeName": "rumantsch grischun"
 }, {
  "code": "rn",
  "name": "Kirundi",
  "nativeName": "kiRundi"
 }, {
  "code": "ro",
  "name": "Romanian, Moldavian, Moldovan",
  "nativeName": "română"
 }, {
  "code": "ru",
  "name": "Russian",
  "nativeName": "русский язык"
 }, {
  "code": "sa",
  "name": "Sanskrit (Saṁskṛta)",
  "nativeName": "संस्कृतम्"
 }, {
  "code": "sc",
  "name": "Sardinian",
  "nativeName": "sardu"
 }, {
  "code": "sd",
  "name": "Sindhi",
  "nativeName": "सिन्धी, سنڌي، سندھی‎"
 }, {
  "code": "se",
  "name": "Northern Sami",
  "nativeName": "Davvisámegiella"
 }, {
  "code": "sm",
  "name": "Samoan",
  "nativeName": "gagana faa Samoa"
 }, {
  "code": "sg",
  "name": "Sango",
  "nativeName": "yângâ tî sängö"
 }, {
  "code": "sr",
  "name": "Serbian",
  "nativeName": "српски језик"
 }, {
  "code": "gd",
  "name": "Scottish Gaelic; Gaelic",
  "nativeName": "Gàidhlig"
 }, {
  "code": "sn",
  "name": "Shona",
  "nativeName": "chiShona"
 }, {
  "code": "si",
  "name": "Sinhala, Sinhalese",
  "nativeName": "සිංහල"
 }, {
  "code": "sk",
  "name": "Slovak",
  "nativeName": "slovenčina"
 }, {
  "code": "sl",
  "name": "Slovene",
  "nativeName": "slovenščina"
 }, {
  "code": "so",
  "name": "Somali",
  "nativeName": "Soomaaliga, af Soomaali"
 }, {
  "code": "st",
  "name": "Southern Sotho",
  "nativeName": "Sesotho"
 }, {
  "code": "es",
  "name": "Spanish; Castilian",
  "nativeName": "español, castellano"
 }, {
  "code": "su",
  "name": "Sundanese",
  "nativeName": "Basa Sunda"
 }, {
  "code": "sw",
  "name": "Swahili",
  "nativeName": "Kiswahili"
 }, {
  "code": "ss",
  "name": "Swati",
  "nativeName": "SiSwati"
 }, {
  "code": "sv",
  "name": "Swedish",
  "nativeName": "svenska"
 }, {
  "code": "ta",
  "name": "Tamil",
  "nativeName": "தமிழ்"
 }, {
  "code": "te",
  "name": "Telugu",
  "nativeName": "తెలుగు"
 }, {
  "code": "tg",
  "name": "Tajik",
  "nativeName": "тоҷикӣ, toğikī, تاجیکی‎"
 }, {
  "code": "th",
  "name": "Thai",
  "nativeName": "ไทย"
 }, {
  "code": "ti",
  "name": "Tigrinya",
  "nativeName": "ትግርኛ"
 }, {
  "code": "bo",
  "name": "Tibetan Standard, Tibetan, Central",
  "nativeName": "བོད་ཡིག"
 }, {
  "code": "tk",
  "name": "Turkmen",
  "nativeName": "Türkmen, Түркмен"
 }, {
  "code": "tl",
  "name": "Tagalog",
  "nativeName": "Wikang Tagalog, ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔"
 }, {
  "code": "tn",
  "name": "Tswana",
  "nativeName": "Setswana"
 }, {
  "code": "to",
  "name": "Tonga (Tonga Islands)",
  "nativeName": "faka Tonga"
 }, {
  "code": "tr",
  "name": "Turkish",
  "nativeName": "Türkçe"
 }, {
  "code": "ts",
  "name": "Tsonga",
  "nativeName": "Xitsonga"
 }, {
  "code": "tt",
  "name": "Tatar",
  "nativeName": "татарча, tatarça, تاتارچا‎"
 }, {
  "code": "tw",
  "name": "Twi",
  "nativeName": "Twi"
 }, {
  "code": "ty",
  "name": "Tahitian",
  "nativeName": "Reo Tahiti"
 }, {
  "code": "ug",
  "name": "Uighur, Uyghur",
  "nativeName": "Uyƣurqə, ئۇيغۇرچە‎"
 }, {
  "code": "uk",
  "name": "Ukrainian",
  "nativeName": "українська"
 }, {
  "code": "ur",
  "name": "Urdu",
  "nativeName": "اردو"
 }, {
  "code": "uz",
  "name": "Uzbek",
  "nativeName": "zbek, Ўзбек, أۇزبېك‎"
 }, {
  "code": "ve",
  "name": "Venda",
  "nativeName": "Tshivenḓa"
 }, {
  "code": "vi",
  "name": "Vietnamese",
  "nativeName": "Tiếng Việt"
 }, {
  "code": "vo",
  "name": "Volapük",
  "nativeName": "Volapük"
 }, {
  "code": "wa",
  "name": "Walloon",
  "nativeName": "Walon"
 }, {
  "code": "cy",
  "name": "Welsh",
  "nativeName": "Cymraeg"
 }, {
  "code": "wo",
  "name": "Wolof",
  "nativeName": "Wollof"
 }, {
  "code": "fy",
  "name": "Western Frisian",
  "nativeName": "Frysk"
 }, {
  "code": "xh",
  "name": "Xhosa",
  "nativeName": "isiXhosa"
 }, {
  "code": "yi",
  "name": "Yiddish",
  "nativeName": "ייִדיש"
 }, {
  "code": "yo",
  "name": "Yoruba",
  "nativeName": "Yorùbá"
 }, {
  "code": "za",
  "name": "Zhuang, Chuang",
  "nativeName": "Saɯ cueŋƅ, Saw cuengh"
 }];
 $scope.cancel = function() {
  $mdDialog.cancel();
 };
 $scope.formValue = function(answer) {
  $mdDialog.hide(answer);
 };
};
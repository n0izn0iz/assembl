SessionApp.directive('comments', [
    '$http',
    '$rootScope',
    'UtilsService',
    'WidgetService',
    'UserService',

    function($http, $rootScope, UtilsService, WidgetService, UserService){

    return {
        restrict:'E',
        scope: {
            idea:'=idea',
            widget:'=widget'
        },
        templateUrl: 'app/shared/directives/comments/comments.html',
        link: function($scope, element){

            $scope.formData = {};
            $scope.comments = [];

            // when the session end up, switch to read only mode
            if($scope.widget.settings.endDate){
                $scope.readOnly = new Date().getTime() > new Date($scope.widget.settings.endDate).getTime();
            }

            $scope.$watch('message', function(value){

                switch(value){
                    case 'commentSubIdea:success':
                        $scope.getCommentsFromSubIdea();
                        break;
                    case 'commentSubIdea:error':
                        break;
                }
            }, true);

            $scope.getUserForComment = function(){

                var config = $scope.$parent.$state.params.config;

                var id = decodeURIComponent(config).split('/')[1],
                    widget = WidgetService.get({id: id}).$promise;

                widget.then(function(w){

                    $scope.discussion = w.discussion;

                    var discussion_id = w.discussion.split('/')[1];

                    return UserService.get({id: discussion_id}).$promise;

                }).then(function(user){
                    user.avatar_url_base = user.avatar_url_base + 30
                    $scope.currentUser = user;

                });

            }

            /**
             * get all comments from a sub idea
             */
            $scope.getCommentsFromSubIdea = function(){

                var rootUrl = $scope.idea.widget_add_post_endpoint,
                    comments = [];

                $http.get(rootUrl).then(function(response){
                    angular.forEach(response.data, function(com){

                        var user_id = com.idCreator.split('/')[1];

                        com.date = moment(com.date).fromNow();
                        com.avatar = '/user/id/'+ user_id +'/avatar/30';

                        comments.push(com);
                    })

                    return comments;

                }).then(function(commments){

                    angular.forEach(commments, function(c){

                        var urlRoot = UtilsService.getURL(c.idCreator);

                        $http.get(urlRoot).then(function(response){

                            c.username = response.data.name;
                        });

                    });

                    $scope.comments = commments;
                });
            }

            /**
             * Comment an idea from creativity session
             */
            $scope.commentSubIdea = function(){

                var rootUrl = $scope.idea.widget_add_post_endpoint,
                    user_id = $scope.idea.avatar.split('/')[3];

                var data = {
                    "type": 'Post',
                    "subject": 'test_message',
                    "body": $scope.formData.comment,
                    "creator_id": parseInt(user_id, 10),
                    "message_id": 'bogus'
                }

                if(data.body && data.creator_id && rootUrl) {

                    $http({
                        method:'POST',
                        url: rootUrl,
                        data: $.param(data),
                        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
                        //headers: {'Content-Type': 'application/json'}
                    }).success(function(){

                        $scope.message = "commentSubIdea:success";
                        $scope.formData.comment = null;

                    }).error(function(){

                        $scope.message = "commentSubIdea:success";
                    });

                }
            }

            $scope.expand = function(e){

                var elm = angular.element(e.currentTarget);

                elm.css('overflow','hidden');
                elm.css('height', 0);
                elm.css('height',elm[0].scrollHeight+'px');
            }

            /**
             * init method
             * */
            $scope.getCommentsFromSubIdea();

            $scope.getUserForComment();

        }
    }
}]);

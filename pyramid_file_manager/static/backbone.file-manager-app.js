// baseURL is defined by the server in a server-side 
// template file
var serverURLs = {
    base: baseURL
    , api: baseURL + 'server/php/'
}

var g_realFiles;

// most href clicks should trigger backbone routing
$(document).on('click', 'a:not([data-bypass])', function(evt) {
    "use strict";

    var href, root;
    href = {
        prop: $(this).prop('href')
        , attr: $(this).attr('href')
    };

    root = location.protocol + '//' + location.host + serverURLs.base;

    if (href.prop && href.prop.slice(0, root.length) === root) {
        evt.preventDefault();

        return Backbone.history.navigate(href.attr, {
            trigger: true
        });
    }
});

var pixelsPer = {};
$(document).ready(function onLoad () {
    $('body').append('<div id="emwide" style="width:1em"></div>');

    pixelsPer.em = $('#emwide').width();
});
    

// We're templating with hogan
Marionette.TemplateCache.prototype.compileTemplate = function (raw) {
    "use strict";

    var compiled = Hogan.compile(raw);
    return function (data) {
        return compiled.render(data);
    };
};

var FileManager = FileManagerFactory(Backbone, Marionette, FileAPI, _, serverURLs, pixelsPer);

function FileManagerFactory (Backbone, Marionette, FileAPI, underscore, serverURLs, pixelsPer) {
    'use strict';

    var $ = Marionette.$ || Backbone.$;
    var _ = underscore;
  
    var __slice = Array.prototype.slice;

    // a decorator that ensures the a function is called with a
    // certain context and arguments
    function callWith (context, fnName, args) {
        return function innerCallWith () {
            context[fnName].call(context, args);
        }
    };

    function sliceArgs(fn, start, end) {
        return function innerSliceArgs () {
            var args = __slice.call(arguments, start, end);
            fn.apply(this, args);
        }
    };

    function withMyFiles (fn) {
        return function innerWithMyFiles () {
            var models = []
                , ids = []
                , files = [];
            if(this.model) {
                models = [this.model];
                ids = [this.model.id];
            }
            if(this.collection) {
                models = models.concat(this.collection.models);
                ids = ids.concat(this.collection.pluck("name"));
            }
            files = _.map(ids, getRealFile);
            return fn.call(this, files, models);
        }
    };

    function bound(ctx, fn) {
        return function () {
            fn.apply(ctx, arguments)
        }
    }

    function delayedBy(milisecs, fn) {
        return function innerDelayed () {
            var that = this;
            var bfn = function () { 
                fn.call(that, arguments);
            }
            window.setTimeout(bfn, milisecs)
        }
    }

    function withErrorCheck (fn) {
        return function innerWithErrorCheck (err) {
            if (!err) {
                fn.apply(this, __slice.call(arguments, 1))
            }
        }
    }

    function withAttr (fn) {
        return function bindAttrName (attrname) {
            return function withAttrFinal () {
                return fn(this.get(attrname));
            }
        }
    }

    var Layout = Marionette.Layout;

    var FileView = Layout.extend({
        template: '#file-template'
        , tagName: 'tr'
        , initialize: function FileViewInit () {
            Layout.prototype.initialize.call(this);
            this.progressView = new ProgressView({
                model: fileProgresses.get(this.model.id)
            });
        }
        , regions: {
            progressRegion: '.progress-container'
        }
        , onRender: function FileViewOnRender () {
            this.progressRegion.show(this.progressView);
            this.insertPreview();
        }
        , events: {
            'click .cancel-file-button': 'cancelUpload'
            , 'click .start-file-button': 'uploadFile'
            , 'click .delete-file-button': 'deleteFile'
        }
        , uploadFile: withMyFiles(UploadFiles)
        , cancelUpload: withMyFiles(CancelUpload)
        , deleteFile: withMyFiles(DeleteWithConfirmation)
        , modelEvents: {
            "change:uploaded": "uploaded"
            , "change:preview": "insertPreview"
        }
        , insertPreview: function insertPreview (model, preview) {
            model = model || this.model;
            preview = preview || model.get('preview');
            if(preview) {
                this.$el.find('.preview').html(preview);
            } 
            else {
                this.$el.find('.preview').html(
                    '<img src="'+model.get('url')+'" />'
                );
            }
        }
        , uploaded: delayedBy(600, function () {
            this.render();
        })
    });


    var FilesView = Marionette.CompositeView.extend({
        itemView: FileView
        , tagName: 'tbody'
        // , loadingView: LoadingView
        // , emptyView: EmptyView
        , template: '#files-template'
        , uploadFiles: withMyFiles(UploadFiles)
        , cancelUpload: withMyFiles(CancelUpload)
        , deleteFiles: withMyFiles(DeleteWithConfirmation)
    });

    var ProgressView = Marionette.ItemView.extend({
        className: 'fileupload-progress'
        , template: '#progress-template'
        , ui: {
            bar: '.bar'
        }
        , modelEvents: {
            'change:percent': 'adjust_bar_width'
        }
        , adjust_bar_width: function adjustBarWidth (model, percent) {
            model = model || this.model;
            percent = percent || model.get('percent');
            this.$('.bar').width(percent+'%');
        }
    });

    var Model = Backbone.Model.extend({
        increment: function increment (attr, value) {
            this.set(attr, this.get(attr) + value)
        }
    });

    var Collection = Backbone.Collection;

    var File = Model.extend({
        url: serverURLs.api
        , idAttribute: "name"
        , save: function () {}
        , defaults: {
            // TODO
            // preview: 'defaultpreviewblob'
        }
        , deleteRemote: withAttr(DeleteRemoteFile)("name")
    });


    var Files = Collection.extend({
        url: '/' // TODO
        , save: function () {}
        , model: File
    });


    var Progress = Model.extend({
        url: '/' // TODO
        , save: function () {}
        , defaults: {
            percent: 0
            , size: 0
        }
    });

    var Progresses = Collection.extend({
        url: '/' // TODO
        , save: function () {}
        , model: Progress
    });


    var AppLayout = Layout.extend({
        template: '#file-manager-template'
        , className: 'row'
        , initialize: function AppLayoutInit (options) {
            Layout.prototype.initialize.call(this, options);
            this.filesView = new FilesView({
                collection: fileModels
            });

        }
        , regions: {
            filesRegion: '#files'
            , totalProgressRegion: '#total-progress'
        }
        , onRender: function AppLayoutOnRender () {
            this.filesRegion.show(this.filesView);
            this.totalProgressRegion.show(totalProgressView);
            // if(_.keys(FileManager.localFiles).length == 0) {
            //     this.totalProgressRegion.$el.hide();
            // }
        }
        , events: {
            'change #file-input': 'filesAdded'
            , 'click #start-button': 'uploadFiles'
            , 'click #cancel-button': 'cancelUpload'
            , 'click #delete-button': 'deleteFiles'
        }
        , filesAdded: function AppLayoutFilesAdded (e) {
            _.each(e.target.files, addRealFile);
            eventStream.trigger("filesAdded");

            // if(_.keys(FileManager.local_files).length > 0) {
            //     this.total_progress_region.$el.show();
            // }
            // clear the files from the file input so they don't accumulate
            $('form')[0].reset();
        }
        , uploadFiles: function () {
            this.filesView.uploadFiles();
        }
        , cancelUpload: function () {
            this.filesView.cancelUpload();
        }
        , deleteFiles: function () {
            this.filesView.deleteFiles();
        }
    });

    var fileModels = new Files();
    var fileProgresses = new Progresses();
    var totalProgress = new Progress();
    var totalProgressView = new ProgressView({
        model: totalProgress
    });
    var realFiles = g_realFiles = [];

    function getRealFile (filename) {
        return _.find(realFiles, function hasFileName (file) {
            return file.name == filename;
        });
    }

    function addRealFile (file) {
        realFiles.push(file);
        fileProgresses.create({
            id: file.name
            , size: file.size
            , percent: 0
        });
        var model = fileModels.create({
            name: file.name
            , size: file.size
            , type: file.type
            , lastModifiedDate: file.lastModified
        });

        // totalProgress.increment('size', file.size);

        if(/image/.test(file.type)) {
            FileAPI.Image(file)
            .resize(15*pixelsPer.em, 20*pixelsPer.em, "max")
            .get(withErrorCheck(function (image) {
                model.set('preview', image);
            }));
        }
    };

    var uploadXHR = null;

    function UploadFiles (realFiles) {
        var currentFile;

        function progressEventHandler (progressModel, evt) {
            progressModel.set("percent", evt.loaded/evt.total*100);
        }

        function prepare (file) {
            currentFile = file;
        }

        function filecomplete (xhr) {
            fileModels.get(currentFile.name).set('uploaded', true);
            var responses = $.parseJSON(xhr.responseText);
            console.log('responses', responses);
            fileModels.add(responses, {merge: true});
        }

        function complete () {
            eventStream.trigger("uploadComplete");
        };

        function getFilesObject () {
            var obj = {}
            _.each(realFiles, function (file) {
                if(file && !fileModels.get(file.name).get('uploaded')) {
                    obj[file.name] = file;
                }
            });
            return obj;
        };

        console.log('files obj',getFilesObject());

        uploadXHR = FileAPI.upload({
            url: serverURLs.api
            , files: getFilesObject()
            , chunkSize: 0 // or chunk size in bytes, eg: FileAPI.MB*.5 (html5)
            , chunkUploadRetry: 0 // number of retries during upload chunks (html5)
            , prepare: prepare
            , fileprogress: function (evt) {
                progressEventHandler(fileProgresses.get(currentFile.name), evt);
            }
            , filecomplete: withErrorCheck(filecomplete)
            , progress: function (evt) {
                progressEventHandler(totalProgress, evt);
            }
            , complete: withErrorCheck(complete)
        });
    };

    function CancelUpload (realFiles) {
        _.each(realFiles, function (file) {
            uploadXHR.abort(file);
        });
        eventStream.trigger("uploadComplete");
        // FileManager.file_progress.each(function (progress) {
        //     progress.set('percent', 0);
        // });
    };

    function DeleteWithConfirmation (realFiles, fileModels) {
        function deleteFile (model) {
            if(window.confirm(
                "Are you sure you want to delete "+model.get("name")+"?")) {
                    model.deleteRemote();
            }
        }
        _.each(fileModels, deleteFile);
    };

    function DeleteRemoteFile (filename) {
        $.post(serverURLs.api, {
            _method: 'DELETE'
            , name: filename
        }
        , function DeleteRequestCallback (response) {
            fileModels.remove(fileModels.get(filename));
        });
    }

    var eventStream = new Backbone.Wreqr.EventAggregator();

    eventStream.on("uploadComplete", delayedBy(600, function () {
        totalProgressView.$el.hide();
        totalProgress.set('percent', 0);
    }));
    eventStream.on("filesAdded", function () {
        totalProgressView.$el.show();
    });

    // Our after-market Marionette Application constructor.
    // The constructor shipped currently does not allow us to set ALL
    // options, forcing us to call methods on the Application object
    // after construction :(
    function makeApplication (options) {
        // omit the options we wish existed.
        var known_options = _.omit(options, "regions", "initializers");

        // Use the shipped constructor
        var app = new Backbone.Marionette.Application(known_options); 

        // now set those options using the provided methods
        app.addRegions(options.regions);
        _.each(options.initializers, sliceArgs(app.addInitializer, 0, 1), app);

        return app;
    };

    // return a Marionette Application instance
    return makeApplication({
        serverURLs: serverURLs
        , regions: {
            mainRegion: '#main'
        }
        , Model: Model
        , FileView: FileView            
        , FilesView: FilesView
        , ProgressView: ProgressView
        , File: File
        , Progress: Progress
        , Progresses: Progresses
        , events: {
            'initialize:after': callWith(Backbone.history, "start", [])
        }
        , initializers: [
            function MainInitializer () {
                $.get(serverURLs.api, function (data) {
                    console.log(data);
                    fileModels.add(data);
                });
                var layout = new AppLayout();
                this.mainRegion.show(layout);
            }
        ]        
    });
};

var g_total_progress;
var g_a_file_progress;

var FileManager = (function(Backbone, Marionette, $, FileAPI) {
    'use strict';

    // This is the primary Marionette application that will control all of
    // our regions on the site
    var FileManager = new Backbone.Marionette.Application();

    FileManager.route_root = '/';

    // most href clicks should trigger backbone routing
    $(document).on('click', 'a:not([data-bypass])', function(evt) {
        var href, root;
        href = {
            prop: $(this).prop('href')
            , attr: $(this).attr('href')
        };

        root = location.protocol + '//' + location.host + FileManager.route_root;

        if (href.prop && href.prop.slice(0, root.length) === root) {
            evt.preventDefault();

            return Backbone.history.navigate(href.attr, {
                trigger: true
            });
        }
    });

    // We're templating with hogan
    Marionette.TemplateCache.prototype.compileTemplate = function (raw) {
        var compiled = Hogan.compile(raw);
        return function (data) {
            return compiled.render(data);
        };
    };

    FileManager.addRegions({
        main_region: '#main'
    });

    FileManager.FileView = Marionette.Layout.extend({
        template: '#file-template'
        , tagName: 'tr'
        , initialize: function () {
            this.progress_view = new FileManager.ProgressView({
                model: g_a_file_progress = FileManager.get_file_progress(this.model.id)
            });
            Marionette.Layout.prototype.initialize.apply(this, arguments);
        }
        , regions: {
            progress_region: '.progress-container'
        }
        , onRender: function () {
            this.progress_region.show(this.progress_view);
            this.insert_preview();
        }
        , events: {
            'click .cancel-file-button': 'cancel_upload'
            , 'click .start-file-button': 'start_upload'
            , 'click .delete-file-button': 'delete_file'
        }
        , start_upload: function () {
            this.xhr = FileManager.upload_files([FileManager.get_local_file(this.model.id)]);
        }
        , cancel_upload: function () {
            this.xhr.abort();
        }
        , delete_file: function () {
            if(window.confirm('Are you really really sure you want to delete '+this.model.get('name')+'?')) {
                // TODO
            }
        }
        , modelEvents: {
            "change:uploaded": "uploaded"
            , "change:preview": "insert_preview"
        }
        , insert_preview: function (model, preview) {
            model = model || this.model;
            preview = preview || model.get('preview');
            $(this.el).find('.preview').html(preview);
        }
        , uploaded: function () {
            var that = this;
            // wait for CSS width transition of progress bar to finish
            FileManager.set_upload_timeout(that.render);
        }
    });


    FileManager.FilesView = Marionette.CompositeView.extend({
        itemView: FileManager.FileView
        , tagName: 'tbody'
        , loadingView: FileManager.LoadingView
        , emptyView: FileManager.EmptyView
        , template: '#files-template'
    });


    FileManager.ProgressView = Marionette.ItemView.extend({
        className: 'fileupload-progress'
        , template: '#progress-template'
        , ui: {
            bar: '.bar'
        }
        , modelEvents: {
            'change:percent': 'percent_changed'
        }
        , percent_changed: function (percent) {
            console.log(this.cid,this.model.cid,'percent changed');
            this.adjust_bar_width(percent);
        }
        , adjust_bar_width: function (model, percent) {
            model = model || this.model;
            percent = percent || model.get('percent');
            this.$('.bar').width(percent+'%');
        }
    });

    var Format = {
        rate: function (bps) {
            if (typeof bps !== 'number') {
                return '';
            }
            if (bps >= 1000000000) {
                return (bps / 1000000000).toFixed(2) + ' Gbit/s';
            }
            if (bps >= 1000000) {
                return (bps / 1000000).toFixed(2) + ' Mbit/s';
            }
            if (bps >= 1000) {
                return (bps / 1000).toFixed(2) + ' Kbit/s';
            }
            return bps.toFixed(2) + ' bit/s';
        }
        , time: function (seconds) {
            var date = new Date(seconds * 1000),
                days = parseInt(seconds / 86400, 10);
            days = days ? days + 'd ' : '';
            return days +
                ('0' + date.getUTCHours()).slice(-2) + ':' +
                ('0' + date.getUTCMinutes()).slice(-2) + ':' +
                ('0' + date.getUTCSeconds()).slice(-2);
        }
        , size: function (bytes) {
            if (typeof bytes !== 'number') {
                return '';
            }
            if (bytes >= 1000000000) {
                return (bytes / 1000000000).toFixed(2) + ' GB';
            }
            if (bytes >= 1000000) {
                return (bytes / 1000000).toFixed(2) + ' MB';
            }
            return (bytes / 1000).toFixed(2) + ' KB';
        }
    };

    FileManager.ProgressNumbersView = Marionette.ItemView.extend({
        template: '#progress-numbers-template'
        , modelEvents: {
            'change:rabbit': 'render'
        }
        , serializeData: function () {
            var start = this.model.get('start') || 1;
            var finish = this.model.get('finish') || 1;
            var rabbit = this.model.get('rabbit') || 1;
            var rate = 100;
            var data = {
                rate: Format.rate(rate)
                , time: Format.time((finish - rabbit) * 8 / rate)
                , percent_finished: (rabbit / finish * 100).toFixed(2)
                , amount_finished: Format.size(rabbit)
                , finish: Format.size(finish)
            };
            return data;
        }
    });
        
    FileManager.Model = Backbone.Model.extend({
        increment: function (attr, value) {
            this.set(attr, this.get(attr) + value)
        }
    });

    FileManager.Collection = Backbone.Collection.extend({
    });

    FileManager.File = Backbone.Model.extend({
        url: '/' // TODO
        , save: function () {}
        , defaults: {
            // TODO
            // preview: 'defaultpreviewblob'
        }
    });

    FileManager.Files = FileManager.Collection.extend({
        url: '/' // TODO
        , save: function () {}
        , model: FileManager.File
    });

    FileManager.Progress = FileManager.Model.extend({
        url: '/' // TODO
        , save: function () {}
        , defaults: {
            percent: 0
            , size: 0
        }
    });


    FileManager.Progresses = FileManager.Collection.extend({
        url: '/' // TODO
        , save: function () {}
        , model: FileManager.Progress
    });
    

    FileManager.Layout = Marionette.Layout.extend({
        template: '#file-manager-template'
        , className: 'row'
        , initialize: function (options) {
            this.files_view = new options.files_view_class({
                collection: options.file_models
            });
            g_total_progress = options.total_progress;
            this.total_progress_view = new options.progress_view_class({
                model: options.total_progress
            });
            console.log('total progress',this.total_progress_view.cid, options.total_progress.cid);

            this.listenTo(FileManager, "upload_complete", this.upload_completed);

            Marionette.Layout.prototype.initialize.call(this, options);
        }
        , regions: {
            files_region: '#files'
            , total_progress_region: '#total-progress'
        }
        , onRender: function () {
            this.files_region.show(this.files_view);
            this.total_progress_region.show(this.total_progress_view);
            if(_.keys(FileManager.local_files).length == 0) {
                this.total_progress_region.$el.hide();
            }
        }
        , events: {
            'change #file-input': 'files_added'
            , 'click #start-button': 'start_upload'
            , 'click #cancel-button': 'cancel_upload'
            , 'click #delete-button': 'delete_files'
            , "upload_complete": "upload_completed"
        }
        , files_added: function (e) {
            _.each(e.target.files, FileManager.add_file);

            if(_.keys(FileManager.local_files).length > 0) {
                this.total_progress_region.$el.show();
            }
            // clear the files from the file input so they don't accumulate
            $('form')[0].reset();
        }
        , start_upload: function () {
            FileManager.upload_files(FileManager.local_files);
        }
        , cancel_upload: function () {
            FileManager.cancel_upload();
        }
        , delete_files: function () {
            if(window.confirm('Are you really really sure you want to delete ALL the files?')) {
                // TODO
            }
        }
        , upload_completed: function () {
            this.total_progress_region.$el.hide();
        }
    });


    FileManager.file_models = new FileManager.Files();
    FileManager.file_progress = new FileManager.Progresses();
    FileManager.file_preview = {};
    FileManager.total_progress = new FileManager.Progress();

    FileManager.local_files = {};
    FileManager.add_file = function (file) {
        FileManager.local_files[file.name] = file;
        FileManager.file_progress.create({
            id: file.name
            , size: file.size
            , percent: 0
        });
        FileManager.file_models.create({
            id: file.name
            , name: file.name
            , size: file.size
            , type: file.type
            , lastModifiedDate: file.lastModified
        });

        FileManager.total_progress.increment('size', file.size);

        if(/image/.test(file.type)) {
            FileAPI.Image(file).resize(100, 100, "max").get(function (err, image) {
                if(!err) {
                    FileManager.file_models.get(file.name).set('preview', image);
                }
            });
        }

    };

    FileManager.get_local_file = function (filename) {
        return FileManager.local_files[filename];
    }

    FileManager.get_file_name = function(file) {
        if(typeof file == 'string') // assume we were given a file name
            return file;
        else // hopefully its an object with a name property
            return file.name
    }

    FileManager.get_file_model = function(file) {
        return this.file_models.get(FileManager.get_file_name(file));
    }

    FileManager.get_file_progress = function (file) {
        return this.file_progress.get(FileManager.get_file_name(file));
    }

    // There is a short CSS transition that for aesthetics we 
    // want to wait to complete before acknowledging that
    // the upload is complete
    FileManager.set_upload_timeout = function (callback) {
        return window.setTimeout(callback, 600);
    }
    
    FileManager.upload_files = function (files) {
        var current_file, dfd = new $.Deferred();
        var xhr = FileAPI.upload({
            url: 'server/php/',
            // data: { foo: 'bar' },
            // headers: { 'x-header': '...' },
            files: files,
            chunkSize: 0, // or chunk size in bytes, eg: FileAPI.MB*.5 (html5)
            chunkUploadRetry: 0, // number of retries during upload chunks (html5)

            // imageTransform: {
            //     maxWidth: 1024,
            //     maxHeight: 768
            // },
            // imageAutoOrientation: true,
            prepare: function (file, options) {
                // prepare options for current file
                // TODO find a better way to know what the current file is
                current_file = file;
            },
            upload: function (xhr, options) {
                // start uploading
            },
            fileupload: function (xhr, options) {
                // start file uploading
                // console.log('fileupload',xhr, options);
            },
            fileprogress: function (evt) {
                // progress file uploading
                var filePercent = evt.loaded/evt.total*100;
                FileManager.get_file_progress(current_file).set('percent', filePercent);
            },
            filecomplete: function (err, xhr) {
                if( !err ) {
                    FileManager.get_file_model(current_file.name).set('uploaded', true);
                    delete FileManager.local_files[current_file.name];
                }
            },
            progress: function (evt) {
                // total progress uploading
                var totalPercent = evt.loaded/evt.total*100;
                console.log('total progress',FileManager.total_progress.cid);
                FileManager.total_progress.set('percent', totalPercent);
            },
            complete: function (err, xhr) {
                if( !err ){
                    // Congratulations, the uploading was successful!
                    // console.log('success!');
                    FileManager.set_upload_timeout(function () {
                        FileManager.trigger("upload_complete");
                        FileManager.total_progress.set('percent', 0);
                    });
                }
            }
        });
        // return dfd.promise();
        return FileManager;
    }

    FileManager.on('initialize:after', function(){
          Backbone.history.start();
    });

    FileManager.Controller = function(){};

    _.extend(FileManager.Controller.prototype, {
        // Start the app by showing the appropriate views
        // and fetching the list of todo items, if there are any
        start: function() {
            var layout = new FileManager.Layout({
                file_models: FileManager.file_models
                , files_view_class: FileManager.FilesView
                , total_progress: FileManager.total_progress
                , file_progress: FileManager.file_progress
                , progress_view_class: FileManager.ProgressView
            });
            FileManager.main_region.show(layout);
        }
    });

    return FileManager;
})(Backbone, Marionette, jQuery, FileAPI);

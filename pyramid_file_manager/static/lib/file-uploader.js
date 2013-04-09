/* This is a extraction of the core file uploading 
 * functionality of the jQuery File Upload Plugin 5.21.1
 * https://github.com/blueimp/jQuery-File-Upload
 * The code has been refactored so that it no longer
 * has dependancies outside of the jQuery core.
 *
/*jslint nomen: true, unparam: true, regexp: true */
/*global define, window, document, File, Blob, FormData, location */


var FileUploader = (function (factory) {
    'use strict';
    return factory(window.jQuery, window._);
}(function ($, _) {
    'use strict';

    // The FileReader API is not actually used, but works as feature detection,
    // as e.g. Safari supports XHR file uploads via the FormData API,
    // but not non-multipart XHR file uploads:

    var support = {
        xhrFileUpload: !!(window.XMLHttpRequestUpload && window.FileReader),
        xhrFormDataFileUpload: !!window.FormData
    };

    var FileUploader = function (options) {
        this.options = _.extend(this.defaults, options);
        // Initialize options set via HTML5 data-attributes:
        // this._initEventHandlers();
    }

    _.extend(FileUploader.prototype, {
        defaults: {
            // To upload large files in smaller chunks, set the following option
            // to a preferred maximum chunk size. If set to 0, null or undefined,
            // or the browser does not support the required Blob API, files will
            // be uploaded as a whole.
            maxChunkSize: 1000,
            // When a non-multipart upload or a chunked multipart upload has been
            // aborted, this option can be used to resume the upload by setting
            // it to the size of the already uploaded bytes. This option is most
            // useful when modifying the options object inside of the "add" or
            // "send" callbacks, as the options are cloned for each file upload.
            uploadedBytes: undefined,
            // By default, failed (abort or error) file uploads are removed from the
            // global progress calculation. Set the following option to false to
            // prevent recalculating the global progress data:
            recalculateProgress: true,
            // Interval in milliseconds to calculate and trigger progress events:
            progressInterval: 100,
            // Interval in milliseconds to calculate progress bitrate:
            bitrateInterval: 500,
            // These options are necesary for uploading files with $.ajax() 
            ajaxOptions: {
                url: 'server/php/',
                type: 'POST',
                processData: false,
                contentType: false,
                cache: false
            }
        },
        
        _getTotalBytesForFiles: function (files) {
            var total = 0;
            each(files)(function (index, file) {
                total += file.size || 1;
            });
            return total;
        },

        _getFormData: function () {
            var form = this._form,
                files = this._files || [];

            var formData = new FormData(form);
            _.each(files, function (file) {
                formData.append(file.name, file);
            });
            return formData;
        },

        addFile: function (file) {
            this._files = this._files || [];
            this._files.push(file);
        },

        setForm: function (form) {
            this._form = form;
        },

        beginUpload: function () { 
            var formData = this._getFormData();
            var xhr = $.ajaxSettings.xhr();
            var that = this;

            $(xhr.upload).bind('progress', function (e) {
                var oe = e.originalEvent;
                // Make sure the progress event properties get copied over:
                e.lengthComputable = oe.lengthComputable;
                e.loaded = oe.loaded;
                e.total = oe.total;
                console.log('progress!!');
                that.options.eventListener.trigger('progress', e);
            });
            var ajaxOptions = _.extend(this.options.ajaxOptions, {
                data: formData
                , xhr: function () { return xhr; }
            });
  
            var jqXHR = $.ajax(ajaxOptions);
            return jqXHR;
        }
    });

    return FileUploader;
}));

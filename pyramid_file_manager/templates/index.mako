
<!DOCTYPE html>
<html lang='en' xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
  <head>
    <meta charset="utf-8">
    <title>File Manager</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="">
    <meta name="author" content="">
    <link rel="icon" 
            type="image/png" 
            href="img/icon.png"></link>
    % for url in webassets(request, 'cascading_style_sheets'):
    <link rel='stylesheet' href='${url}' media='all' />
    % endfor
    % for CSS_file_name in [ \
        'index.css',         \
        'file_manager.css',  \
        'bootstrap.min.css', \
        ]:
    <link rel='stylesheet' media='all' href='${request.static_url("pyramid_file_manager:static/css/%s" % CSS_file_name)}' />
    % endfor



    <script type="text/javascript">
        var FileAPI = {
            // @required
            staticPath: '/static/lib/' // @default: './'
        };
        
        var baseURL = '${request.route_url("index")}';
    </script>

    % for JS_file_name in [ \
        'jquery.min.js',    \
        'underscore.js',    \
        'backbone.js',      \
        'backbone.marionette.js', \
        'hogan-3.0.0.js',   \
        'FileAPI.min.js',   \
    ]:
    <script type='text/javascript' src='${request.static_url("pyramid_file_manager:static/lib/%s" % JS_file_name)}'></script>
    % endfor
    <script type='text/javascript' src='${request.static_url("pyramid_file_manager:static/backbone.marionette.app.js")}'></script>

  </head>
  <body>
      <noscript>Javascript must be enabled for the correct page display</noscript>
      <div id="main" class="container fileupload-widget-root">
          <!-- this is where all the dynamic markup magic happens -->
      </div>
      <script type="text/x-mustache" id="file-manager-template">
          <div class="fileupload-buttonbar clearfix">
              <div class="span7">
                  <form id='fileupload'>
                      <span class="btn btn-success fileinput-button">
                          <i class="icon-plus icon-white"></i>
                          <span>Add Files...</span>
                          <input type="file" name="files[]" id="file-input" multiple>
                      </span>
                  </form>
                  <button type="submit" id="start-button" class="btn btn-primary start">
                      <i class="icon-upload icon-white"></i>
                      <span>Start All</span>
                  </button>
                  <button id="cancel-button" type="reset" class="btn btn-warning cancel">
                      <i class="icon-ban-circle icon-white"></i>
                      <span>Cancel All</span>
                  </button>
                  <button id="delete-button" type="button" class="btn btn-danger delete">
                      <i class="icon-trash icon-white"></i>
                      <span>Delete All</span>
                  </button>
              </div>
              <div class="span5">
                  <div id="total-progress">

                  </div>
              </div>
          </div>
          <table role="presentation" class="table table-striped" id="files">
            <!-- files view goes here -->
          </table>
      </script>
      <script type="text/x-mustache" id="file-template">      
          {{^uploaded}}
          <td class="preview"></td>
          {{/uploaded}}
          {{#uploaded}}
          <td><a class='preview' href='{{url}}'></a></td>
          {{/uploaded}}
          <td class="name"><span>{{name}}<span></td>
          <td class="size"><span>{{size}}</span></td>
          {{#error}}
          <td class="error" colspan="2"><span class="label label-important">Error</span>{{error}}</td>
          {{/error}} 
          {{^error}}
          {{^uploaded}}
          <td class="progress-container span2">
          </td>
          <td class="start">
              <button class="btn btn-primary start-file-button">
                  <i class="icon-upload icon-white"></i>
                  <span>Start</span>
              </button>
          </td>
          <td class="cancel">
              <button class="btn btn-warning cancel-file-button">
                  <i class="icon-ban-circle icon-white"></i>
                  <span>Cancel</span>
              </button>
           </td>
          {{/uploaded}}
          {{#uploaded}}
          <td class="url">
              <a href='{{url}}' target='_blank' data-bypass>{{url}}</a>
          </td>
          <td class="delete">
              <button type="button" class="btn btn-danger delete delete-file-button">
                  <i class="icon-trash icon-white"></i>
                  <span>Delete</span>
              </button>
          </td>
          {{/uploaded}}
          {{/error}}
      </script>
      <script type="text/x-mustache" id="files-template">
      </script>
      <script type="text/x-mustache" id="progress-template">
          <div class="progress progress-success progress-striped active" role="progressbar" aria-valuemin="0" aria-valuemax="100">
              <div class="bar" style="width:{{percent}}%;"></div>
          </div>
      </script>
      <script type="text/x-mustache" id="progress-numbers-template">
          <!-- The extended global progress information -->
          {{rate}} | {{time}} | {{percent_finished}}% | {{amount_finished}} | {{finish}}
      </script>
      <script type="text/javascript">
          FileManager.start();
      </script>
  </body>
</html>

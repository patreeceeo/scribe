from webassets import Bundle

def includeme(config):

    javascript_bundle = Bundle(
            'lib/*.js'
            , 'backbone.marionette.app.js'
            , filters='uglifyjs'
            , output='scribe.min.js'
    )

    cascading_style_sheet_bundle = Bundle(
            'css/*.css'
            , filters='cssmin'
            , debug='merge'
            , output='scribe.min.css'
    )

    config.add_webasset('javascript', javascript_bundle)
    config.add_webasset('cascading_style_sheets', cascading_style_sheet_bundle)


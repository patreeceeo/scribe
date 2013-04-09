from pyramid.config import Configurator


def main(global_config, **settings):
    """ This function returns a Pyramid WSGI application.
    """
    config = Configurator(settings=settings)
    config.add_static_view('static', 'static', cache_max_age=3600)
    config.add_static_view('images', 'images', cache_max_age=3600)
    config.add_route('index', '/')
    # upload processing
    # After replacing server/php/ in imageupload.pt with tal:attributes="action actionurl"
    # the following can be replaced with any URL base
    config.add_route('upload', '/server/php{sep:/*}{name:.*}')
    # retrieving images
    config.add_route('view', '/image/{name:.+}')
    config.scan()
    return config.make_wsgi_app()

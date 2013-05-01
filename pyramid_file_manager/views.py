from pyramid.view import view_config, view_defaults
from pyramid.exceptions import NotFound
import re, os, shutil
import io


# Replace server/php/ in imageupload.pt with tal:attributes="action actionurl"
# to keep urls consistant
@view_config(route_name='index',request_method='GET', renderer='pyramid_file_manager:templates/index.mako')
def imageupload(request):
    return {'actionurl':request.route_url('upload',sep='',name='')}

MIN_FILE_SIZE = 1 # bytes
MAX_FILE_SIZE = 5000000 # bytes
IMAGE_TYPES = re.compile('image/(gif|p?jpeg|(x-)?png)')
ACCEPT_FILE_TYPES = IMAGE_TYPES
EXPIRATION_TIME = 300 # seconds
# change the following to POST if DELETE isn't supported by the webserver
DELETEMETHOD='DELETE'

class Image:
    def imagepath(self, name):
        return os.path.join(self.request.registry.settings['scribe.users_path'], name)

@view_defaults(route_name='upload')
class ImageUpload(Image):

    def __init__(self,request):
        self.request = request
        request.response.headers['Access-Control-Allow-Origin'] = '*'
        request.response.headers['Access-Control-Allow-Methods'] = 'OPTIONS, HEAD, GET, POST, PUT, DELETE'
        print "incoming request"
        # import pdb; pdb.set_trace()

    def validate(self, file):
        if file['size'] < MIN_FILE_SIZE:
            file['error'] = 'minFileSize'
        elif file['size'] > MAX_FILE_SIZE:
            file['error'] = 'maxFileSize'
        elif not ACCEPT_FILE_TYPES.match(file['type']):
            file['error'] = 'acceptFileTypes'
        else:
            return True
        return False

    def get_file_size(self, file):
        file.seek(0, 2) # Seek to the end of the file
        size = file.tell() # Get the position of EOF
        file.seek(0) # Reset the file position to the beginning
        return size

    def fileinfo(self,name):
        filename = self.imagepath(name) 
        f, ext = os.path.splitext(name)
        if ext!='.type' and os.path.isfile(filename):
            info = {}
            info['name'] = name
            info['size'] = os.path.getsize(filename)
            info['url'] = self.request.route_url('view',name=name)
            info['delete_type'] = DELETEMETHOD
            info['delete_url'] = self.request.route_url('upload',sep='',name='') + '/' + name
            if DELETEMETHOD != 'DELETE':
                info['delete_url'] += '&_method=DELETE'
            return info
        else:
            return None

    @view_config(request_method='OPTIONS')
    def options(self):
        return Response(body='')

    @view_config(request_method='HEAD')
    def options(self):
        return Response(body='')

    @view_config(request_method='GET', renderer="json")
    def get(self):
        p = self.request.matchdict.get('name')
        if p:
            return self.fileinfo(p)
        else:
            filelist = []
            for f in os.listdir(self.imagepath("")):
                n = self.fileinfo(f)
                if n:
                    n['uploaded'] = True
                    print "n:",n
                    filelist.append(n)
            return filelist

    @view_config(request_method='DELETE', xhr=True, accept="application/json", renderer='json')
    def delete(self):
        filename = self.request.POST.get('name')
        print 'delete',filename
        try:
            os.remove(self.imagepath(filename) + '.type')
            print 'deleted image type info'
        except IOError:
            pass
        try:
            os.remove(self.imagepath(filename))
            print 'deleted image'
        except IOError:
            return False
        return True

    def get_content_range(self):
        ints = re.findall('([0-9]+)', self.request.headers['Content-Range']) 
        return range(int(ints[0]), int(ints[1]))

    def get_content_length(self):
        ints = re.findall('([0-9]+)', self.request.headers['Content-Length']) 
        return int(ints[0])


    def get_filename(self):
        return re.findall('(?<=filename=)["\']?([\w\.\-]+)["\']?', self.request.headers['Content-Disposition'])[0] 

    def get_file_type(self):
        return self.request.headers['Content-Type']


    @view_config(request_method='POST', xhr=True, accept="application/json", renderer='json')
    def post(self):
        from pprint import pprint

        print 'self.request.POST:',
        pprint (self.request.POST)
        if self.request.POST.get('_method') == "DELETE":
            return self.delete()

        # If this is a chunked upload there will be no POST/form variables, 
        # but just the current chunk of the file being uploaded.
        if not self.request.POST:
            filename = self.get_filename()
            start = min(self.get_content_range())
            with open(self.imagepath(filename), 'a+b') as f:
                f.seek(start)
                shutil.copyfileobj(self.request.body_file, f)
     
            with open( self.imagepath(filename + '.type'), 'w') as f:
                f.write(self.get_file_type())

            return [{
                'name': filename,
                'url': self.request.route_url('view',name=filename)
            }]

      
        results = []
        for name, fieldStorage in self.request.POST.items():
            if isinstance(fieldStorage,unicode):
                continue
            result = {}
            result['name'] = os.path.basename(fieldStorage.filename)
            result['type'] = fieldStorage.type
            result['size'] = self.get_file_size(fieldStorage.file)
            if self.validate(result):
                with open( self.imagepath(result['name'] + '.type'), 'w') as f:
                    f.write(result['type'])
                with open( self.imagepath(result['name']), 'w') as f:
                    shutil.copyfileobj( fieldStorage.file , f)

                result['delete_type'] = DELETEMETHOD
                result['delete_url'] = self.request.route_url('upload',sep='',name='') + '/' + result['name']
                result['url'] = self.request.route_url('view',name=result['name'])
                print 'url', result['url']
                if DELETEMETHOD != 'DELETE':
                    result['delete_url'] += '&_method=DELETE'
            results.append(result)
        pprint(results)
        return results


@view_defaults(route_name='view')
class ImageView(Image):

    def __init__(self,request):
        self.request = request

    @view_config(request_method='GET', http_cache = (EXPIRATION_TIME, {'public':True}))
    def get(self):
        page = self.request.matchdict.get('name')
        try:
            with open( self.imagepath( os.path.basename(page) ) + '.type', 'r', 16) as f:
                self.request.response.content_type = f.read()
        except IOError:
            pass
        try:
            self.request.response.body_file = open( self.imagepath(page), 'r', 10000)
        except IOError:
            raise NotFound
        return self.request.response

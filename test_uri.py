from django.http import HttpRequest
req = HttpRequest()
req.META['HTTP_HOST'] = 'malasakit-webservice.onrender.com'
req.META['SERVER_PORT'] = '443'
try:
    print("Test 1:", req.build_absolute_uri('https://res.cloudinary.com/foo/bar.png'))
    print("Test 2:", req.build_absolute_uri('http://res.cloudinary.com/foo/bar.png'))
except Exception as e:
    print("Error:", e)

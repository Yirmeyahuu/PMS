import os
from cloudinary_storage.storage import MediaCloudinaryStorage

class AutoMediaCloudinaryStorage(MediaCloudinaryStorage):
    def _get_resource_type(self, name):
        """
        Dynamically determine resource_type for Cloudinary based on file extension.
        Cloudinary delivery URLs DO NOT support 'auto', they must be 'image', 'video', or 'raw'.
        """
        if not name:
            return 'image'
            
        ext = os.path.splitext(name)[1].lower()
        
        raw_exts = {'.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.txt', '.zip'}
        video_exts = {'.mp4', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.webm'}
        
        if ext in raw_exts:
            return 'raw'
        elif ext in video_exts:
            return 'video'
        else:
            return 'image'

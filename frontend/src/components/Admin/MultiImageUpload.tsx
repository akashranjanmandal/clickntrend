import React, { useState } from 'react';
import { Upload, X, Camera, Star, Trash2 } from 'lucide-react';

interface ImageFile {
  file: File;
  preview: string;
  url?: string;
  is_primary: boolean;
}

interface UploadedImage {
  url: string;
  filename: string;
  is_primary: boolean;
}

interface MultiImageUploadProps {
  onImagesUploaded: (images: { url: string; is_primary: boolean }[]) => void;
  maxImages?: number;
}

const MultiImageUpload: React.FC<MultiImageUploadProps> = ({ 
  onImagesUploaded, 
  maxImages = 5 
}) => {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (images.length + files.length > maxImages) {
      alert(`You can only upload up to ${maxImages} images`);
      return;
    }

    const newImages: ImageFile[] = files.map((file, index) => ({
      file,
      preview: URL.createObjectURL(file),
      is_primary: images.length === 0 && index === 0
    }));

    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    // If we removed the primary image, make the first one primary
    if (images[index]?.is_primary && newImages.length > 0) {
      newImages[0].is_primary = true;
    }
    setImages(newImages);
  };

  const setAsPrimary = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      is_primary: i === index
    }));
    setImages(newImages);
  };

  const uploadImages = async () => {
    if (images.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    images.forEach((img: ImageFile) => {
      formData.append('images', img.file);
    });

    try {
      const token = localStorage.getItem('admin_token');
      const response = await fetch('/api/upload/product-images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      
      // Update local images with URLs from server
      const updatedImages: ImageFile[] = data.images.map((img: UploadedImage, index: number) => ({
        ...images[index],
        url: img.url,
        is_primary: images[index]?.is_primary || false
      }));

      setImages(updatedImages);
      
      // Notify parent
      onImagesUploaded(updatedImages.map((img: ImageFile) => ({
        url: img.url!,
        is_primary: img.is_primary
      })));

    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload images');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Image Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {images.map((image: ImageFile, index: number) => (
          <div key={index} className="relative group aspect-square">
            <img
              src={image.preview}
              alt={`Product ${index + 1}`}
              className="w-full h-full object-cover rounded-lg"
            />
            
            {/* Primary Badge */}
            {image.is_primary && (
              <div className="absolute top-2 left-2 bg-yellow-400 text-white p-1 rounded-full">
                <Star className="h-4 w-4 fill-current" />
              </div>
            )}

            {/* Action Buttons */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
              {!image.is_primary && (
                <button
                  onClick={() => setAsPrimary(index)}
                  className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                  title="Set as primary"
                >
                  <Star className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => removeImage(index)}
                className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                title="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}

        {/* Upload Button */}
        {images.length < maxImages && (
          <label className="border-2 border-dashed border-gray-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:border-premium-gold transition-colors">
            <Camera className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Upload</span>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>

      {/* Upload Button */}
      {images.length > 0 && !uploading && (
        <button
          onClick={uploadImages}
          className="w-full py-3 bg-premium-gold text-white rounded-lg hover:bg-premium-burgundy flex items-center justify-center gap-2"
        >
          <Upload className="h-5 w-5" />
          Upload {images.length} {images.length === 1 ? 'Image' : 'Images'}
        </button>
      )}

      {uploading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-gold mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Uploading images...</p>
        </div>
      )}
    </div>
  );
};

export default MultiImageUpload;
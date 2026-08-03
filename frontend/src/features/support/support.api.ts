import axiosInstance from '@/lib/axios';
import type { UserFeedback, CreateFeedbackPayload, UserFeedbackAttachment } from '@/types/support';

export const supportApi = {
  createFeedback: async (data: CreateFeedbackPayload): Promise<UserFeedback> => {
    const response = await axiosInstance.post('/support/feedback/', data);
    return response.data;
  },

  listMyFeedback: async (): Promise<UserFeedback[]> => {
    const response = await axiosInstance.get('/support/feedback/');
    return response.data;
  },

  getFeedbackDetails: async (id: number): Promise<UserFeedback> => {
    const response = await axiosInstance.get(`/support/feedback/${id}/`);
    return response.data;
  },

  uploadAttachment: async (feedbackId: number, file: File): Promise<UserFeedbackAttachment> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axiosInstance.post(
      `/support/feedback/${feedbackId}/upload_attachment/`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
  
  getAttachmentUrl: (feedbackId: number, attachmentId: number): string => {
    // This allows fetching the secure download endpoint
    return `/api/support/feedback/${feedbackId}/attachments/${attachmentId}/`;
  }
};

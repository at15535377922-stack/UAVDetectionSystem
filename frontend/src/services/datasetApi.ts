import api from './api'

export interface Dataset {
  id: number
  name: string
  description: string | null
  version: string
  format: string
  num_images: number
  num_classes: number
  class_names: { names: string[] } | null
  storage_path: string | null
  size_mb: number
  split_ratio: Record<string, number> | null
  status: string
  creator_id: number | null
  created_at: string
  updated_at: string
}

export interface TrainingJob {
  id: number
  name: string
  dataset_id: number
  base_model: string
  epochs: number
  batch_size: number
  image_size: number
  learning_rate: number
  hyperparams: Record<string, any> | null
  status: string
  progress: number
  current_epoch: number
  metrics: Record<string, number> | null
  output_model_path: string | null
  error_message: string | null
  creator_id: number | null
  started_at: string | null
  completed_at: string | null
  created_at: string
}

export const datasetApi = {
  list: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get<any, { datasets: Dataset[]; total: number }>('/datasets', { params }),

  get: (id: number) =>
    api.get<any, Dataset>(`/datasets/${id}`),

  create: (data: { name: string; description?: string; version?: string; format?: string; num_classes?: number; class_names?: string[] }) =>
    api.post<any, Dataset>('/datasets', data),

  update: (id: number, data: Partial<{ name: string; description: string; version: string; status: string; num_images: number; num_classes: number }>) =>
    api.put<any, Dataset>(`/datasets/${id}`, data),

  delete: (id: number) =>
    api.delete(`/datasets/${id}`),

  uploadImages: (id: number, files: File[]) => {
    const formData = new FormData()
    files.forEach((f) => formData.append('files', f))
    return api.post<any, Dataset>(`/datasets/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export const trainingApi = {
  list: (params?: { skip?: number; limit?: number; status?: string }) =>
    api.get<any, { jobs: TrainingJob[]; total: number }>('/training/jobs', { params }),

  get: (id: number) =>
    api.get<any, TrainingJob>(`/training/jobs/${id}`),

  create: (data: { name: string; dataset_id: number; base_model?: string; epochs?: number; batch_size?: number; image_size?: number; learning_rate?: number }) =>
    api.post<any, TrainingJob>('/training/jobs', data),

  start: (id: number) =>
    api.post<any, TrainingJob>(`/training/jobs/${id}/start`),

  stop: (id: number) =>
    api.post<any, TrainingJob>(`/training/jobs/${id}/stop`),

  simulateProgress: (id: number) =>
    api.post<any, TrainingJob>(`/training/jobs/${id}/simulate-progress`),

  delete: (id: number) =>
    api.delete(`/training/jobs/${id}`),
}

export type DateStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled'
export type PlaceCategory = 'restaurant' | 'cafe' | 'mall' | 'cinema' | 'park' | 'entertainment' | 'nature' | 'other'

export interface CoupleDate {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string
  planned_start_time: string
  planned_finish_time: string
  actual_start_at: string | null
  actual_finish_at: string | null
  status: DateStatus
  location_name: string | null
  address: string | null
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
  google_maps_url: string | null
  budget: number | null
  cover_image_url: string | null
  created_at: string
  updated_at: string
}

export interface DateActivity {
  id: string
  date_id: string
  title: string
  description: string | null
  start_time: string
  finish_time: string | null
  location_name: string | null
  order_index: number
  created_at: string
}

export interface Place {
  id: string
  user_id: string
  name: string
  address: string | null
  latitude: number | null
  longitude: number | null
  google_place_id: string | null
  google_maps_url: string | null
  category: PlaceCategory
  rating_food: number | null
  rating_atmosphere: number | null
  rating_service: number | null
  rating_price: number | null
  rating_overall: number | null
  review: string | null
  visit_date: string | null
  is_favorite: boolean
  created_at: string
  updated_at: string
}

export interface Moment {
  id: string
  user_id: string
  title: string
  description: string | null
  date: string
  location: string | null
  image_url: string | null
  photo_id: string | null
  rating: number | null
  is_favorite: boolean
  created_at: string
}

export interface Photo {
  id: string
  user_id: string
  storage_path: string
  image_url: string | null
  caption: string | null
  date: string | null
  location: string | null
  is_favorite: boolean
  created_at: string
  signedUrl?: string
}

export interface WheelPlace {
  id: string
  user_id: string
  name: string
  category: string | null
  is_active: boolean
  created_at: string
}

export interface SpinHistory {
  id: string
  user_id: string
  place_id: string | null
  selected_place_name: string
  created_at: string
}

export type Insertable<T> = Omit<T, 'id' | 'user_id' | 'created_at' | 'updated_at'>

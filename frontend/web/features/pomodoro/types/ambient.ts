export type PredefinedAmbientTrackId =
  | "none"
  | "lofi_relax"
  | "gentle_piano"
  | "rain_heavy"
  | "ocean_waves"
  | "coffee_shop"
  | "forest_wind"
  | "alpha_drone_432hz";

export type AmbientTrackId = PredefinedAmbientTrackId | (string & {});

export interface AmbientTrack {
  id: AmbientTrackId;
  name: string;
  category: "music" | "nature" | "ambient" | "custom";
  icon: string;
  description: string;
  url?: string;
  isProcedural?: boolean;
  isCustom?: boolean;
}

export const AMBIENT_TRACKS: AmbientTrack[] = [
  {
    id: "none",
    name: "Tắt âm thanh nền",
    category: "ambient",
    icon: "VolumeX",
    description: "Không phát âm thanh trong lúc tập trung",
  },
  {
    id: "lofi_relax",
    name: "Lofi Chill & Focus",
    category: "music",
    icon: "Headphones",
    description: "Giai điệu lofi không lời nhẹ nhàng giúp tập trung sâu",
    url: "https://actions.google.com/sounds/v1/relaxing/relaxing_music.ogg",
  },
  {
    id: "gentle_piano",
    name: "Piano du dương thư giãn",
    category: "music",
    icon: "Music",
    description: "Tiếng đàn piano êm dịu tạo không gian làm việc tĩnh lặng",
    url: "https://actions.google.com/sounds/v1/relaxing/bell_chime_meditation.ogg",
  },
  {
    id: "alpha_drone_432hz",
    name: "Sóng não Alpha 432Hz (Deep Flow)",
    category: "music",
    icon: "Radio",
    description: "Âm thanh hòa âm 432Hz kích thích tập trung và giảm căng thẳng",
    isProcedural: true,
  },
  {
    id: "rain_heavy",
    name: "Mưa rào êm dịu (Gentle Rain)",
    category: "nature",
    icon: "CloudRain",
    description: "Tiếng mưa rào đều đặn che bớt tạp âm xung quanh",
    url: "https://actions.google.com/sounds/v1/weather/rain_heavy.ogg",
  },
  {
    id: "coffee_shop",
    name: "Quán cà phê yên tĩnh (Cozy Cafe)",
    category: "ambient",
    icon: "Coffee",
    description: "Âm hưởng quán cafe ấm cúng quen thuộc khi làm việc",
    url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg",
  },
  {
    id: "ocean_waves",
    name: "Sóng biển rì rào (Ocean Waves)",
    category: "nature",
    icon: "Waves",
    description: "Nhịp sóng biển vỗ bờ thư thái, sảng khoái tinh thần",
    url: "https://actions.google.com/sounds/v1/water/waves_crashing_on_rocks_close_perspective.ogg",
  },
  {
    id: "forest_wind",
    name: "Gió rừng rì rào (Forest Breeze)",
    category: "nature",
    icon: "Wind",
    description: "Tiếng gió lùa qua rừng cây mang lại cảm giác tươi mới",
    url: "https://actions.google.com/sounds/v1/weather/wind_blowing_softly.ogg",
  },
];

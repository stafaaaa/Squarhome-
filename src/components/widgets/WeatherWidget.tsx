import * as React from "react";
import { Cloud, CloudRain, Sun, Wind, Loader2 } from "lucide-react";

interface WeatherData {
  temp: number;
  condition: string;
  city: string;
  icon: string;
}

export function WeatherWidget() {
  const [weather, setWeather] = React.useState<WeatherData | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchWeather = async () => {
      try {
        const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY || "895284fb2d2c1d877c72425984527a36"; 
        const city = "Berlin";
        const res = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=metric&appid=${API_KEY}`
        );
        
        if (!res.ok) {
          throw new Error(`Weather API error: ${res.statusText}`);
        }

        const data = await res.json();
        
        if (data.main) {
          setWeather({
            temp: Math.round(data.main.temp),
            condition: data.weather[0].main,
            city: data.name,
            icon: data.weather[0].icon
          });
        }
      } catch (error) {
        console.error("Weather fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 600000); // Update every 10 mins
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin opacity-20" />
      </div>
    );
  }

  if (!weather) return null;

  return (
    <div className="flex flex-col h-full w-full justify-between p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-3xl font-bold">{weather.temp}°</div>
          <div className="text-[10px] uppercase opacity-60 font-medium">{weather.condition}</div>
        </div>
        <img 
          src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`} 
          alt="Weather"
          className="w-12 h-12 -mt-2"
          referrerPolicy="no-referrer"
        />
      </div>
      
      <div className="flex justify-between items-end mt-4">
        {/* Simplified forecast for demo */}
        <div className="flex flex-col items-center">
          <Sun className="w-4 h-4 text-yellow-400" />
          <span className="text-[8px] mt-1">MOR</span>
        </div>
        <div className="flex flex-col items-center">
          <Cloud className="w-4 h-4 opacity-40" />
          <span className="text-[8px] mt-1">MIT</span>
        </div>
        <div className="flex flex-col items-center">
          <CloudRain className="w-4 h-4 text-blue-400" />
          <span className="text-[8px] mt-1">ABN</span>
        </div>
      </div>
      
      <div className="text-[10px] opacity-40 mt-2">{weather.city}</div>
    </div>
  );
}

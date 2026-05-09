import { onRequestPost as __api_recommend_bike_js_onRequestPost } from "D:\\bike-store-website\\functions\\api\\recommend-bike.js"

export const routes = [
    {
      routePath: "/api/recommend-bike",
      mountPath: "/api",
      method: "POST",
      middlewares: [],
      modules: [__api_recommend_bike_js_onRequestPost],
    },
  ]
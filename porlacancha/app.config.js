module.exports = {
  expo: {
    name: "PorLaCancha",
    slug: "porlacancha",
    scheme: "porlacancha",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "dark",
    splash: {
      image: "./assets/logo.jpeg",
      backgroundColor: "#001B44",
      resizeMode: "contain",
    },
    ios: {
      bundleIdentifier: "com.porlacancha.app",
      supportsTablet: true,
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      package: "com.porlacancha.app",
      adaptiveIcon: {
        backgroundColor: "#001B44",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-font",
      "expo-asset",
      "expo-splash-screen",
      [
        "expo-image-picker",
        {
          photosPermission: "PorLaCancha usa tus fotos para el escudo del equipo.",
        },
      ],
    ],
    // Cuando haya credenciales Google/Apple (NO en Expo Go):
    // extra plugins:
    //   ["@react-native-google-signin/google-signin", { iosUrlScheme: "com.googleusercontent.apps.XXXX" }],
    //   "expo-apple-authentication",
  },
};

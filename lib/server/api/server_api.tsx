const apis = {
  client: {
    signIn: "/adduuid",
    logOut: "/removeuuid",
  },
  picture: {
    upload: "/upload",
    get: "/getpicture",
    delete: "/clear",
  },
  server: {
    info: "/info",
    test: "/test",
    logs: "/getlogs",
    database: "/getdatabase",
  },
  ocr: {
    start: "/start",
    status: "/status",
  },
}

export default apis
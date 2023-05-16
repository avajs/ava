export default async () => ({
	require: [
    ["req.js", {
      "ignore": ["test/*"]
    }]
  ]
});

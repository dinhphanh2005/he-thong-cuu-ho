const mongoose = require('mongoose');
const url = 'mongodb+srv://root:123@cluster0.pht5w.mongodb.net/cuuho?retryWrites=true&w=majority';
mongoose.connect(url).then(async () => {
  const db = mongoose.connection.db;
  const teams = await db.collection('rescueteams').find({}, { projection: { name: 1, status: 1, lastLocationUpdate: 1 } }).toArray();
  console.log("Teams:", teams);
  process.exit(0);
});

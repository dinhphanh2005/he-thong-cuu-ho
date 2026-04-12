const mongoose = require('mongoose');
const Incident = require('./models/Incident');
const RescueTeam = require('./models/RescueTeam');

const url = 'mongodb+srv://root:123@cluster0.pht5w.mongodb.net/cuuho?retryWrites=true&w=majority';
mongoose.connect(url).then(async () => {
  // get team 1 and 2
  const teams = await RescueTeam.find({}).lean();
  console.log("Teams:");
  teams.forEach(t => console.log(t.name, "Status:", t.status, "ActiveIncident:", t.activeIncident));
  
  const incidents = await Incident.find({status: {$nin: ['COMPLETED']}}).lean();
  console.log("Incidents:");
  incidents.forEach(i => console.log(i.code, i.status, "offeredTo:", i.offeredTo, "assignedTo:", i.assignedTeam));
  process.exit(0);
});

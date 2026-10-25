import { db, dashboard } from "../src/lib/database";
db();
const data=dashboard(null);
console.log(JSON.stringify({migrated:true,environment:data.environment,treasuryMicros:data.balanceMicros,auditValid:data.auditValid},null,2));

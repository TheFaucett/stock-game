const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"; // For Next.js and Vercel
console.log("All envs:", Object.entries(process.env).filter(([k]) => k.startsWith('NEXT_PUBLIC_')));
export default API_BASE_URL;

import { Link } from "react-router-dom";
import { DemoRolePicker } from "@/components/auth/DemoAuth";
import { BrandMark } from "@/components/layout/BrandMark";
import { ThemeToggle } from "@/components/layout/ThemeToggle";

export default function Login() {
  return <main className="demo-login"><div className="support-card-heading"><Link to="/" className="workspace-brand"><BrandMark /> EduNex</Link><ThemeToggle /></div><h1>Student success, from your perspective</h1><p>Demonstration Institutional Dataset · All students, staff and actions are synthetic. Server-enforced views let you explore how a team reviews and follows up on student support.</p><DemoRolePicker /></main>;
}

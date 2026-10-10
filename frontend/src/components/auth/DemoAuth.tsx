import { createContext, useContext, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { get, mutate } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { PageSkeleton } from "@/components/skeletons";
import { ErrorState } from "@/components/states/States";
import "@/components/interventions/support.css";

export interface DemoUser {id:string;name:string;role:"admin"|"faculty"|"mentor"|"counselor";department:string|null;scope:string}
export const DemoIdentityContext = createContext<DemoUser|null>(null);
export const useDemoIdentity = () => useContext(DemoIdentityContext);

export function AuthGate({children}:{children:ReactNode}) {
  const health=useQuery({queryKey:["backend-health"],queryFn:({signal})=>get<{status:string;database:string}>("/health",undefined,signal),staleTime:30_000});
  
  if(health.isPending)return <PageSkeleton />;
  if(health.isError)return <ErrorState message="The demo service or database is waking up. Retry in a moment." retry={()=>void health.refetch()} />;
  
  const defaultUser: DemoUser = {
    id: "dean-demo",
    name: "Demo Dean / Admin",
    role: "admin",
    department: null,
    scope: "All synthetic students and institutional KPIs"
  };
  
  return <DemoIdentityContext value={defaultUser}>{children}</DemoIdentityContext>;
}

export function DemoRolePicker() {
  const client=useQueryClient(), navigate=useNavigate(), location=useLocation();
  const users=useQuery({queryKey:["demo-users"],queryFn:()=>get<{users:DemoUser[];notice:string}>("/auth/users")});
  const login=useMutation({mutationFn:(user_id:string)=>mutate<{user:DemoUser}>("/auth/session","POST",{user_id}),
    onSuccess:async session=>{
      await client.cancelQueries(); client.clear(); client.setQueryData(["demo-session"],session);
      const requested=location.state?.from;
      navigate(typeof requested==="string" && requested.startsWith("/") && !requested.startsWith("//") ? requested : session.user.role==="mentor" || session.user.role==="counselor" ? "/students" : "/dashboard",{replace:true});
    }});
  if(users.isPending)return <PageSkeleton />;
  if(users.isError)return <ErrorState message="The demo server may be waking up. Try again shortly." retry={()=>void users.refetch()} />;
  return <section className="support-section" aria-label="Choose a demo role"><h2>Explore a stakeholder view</h2><p>{users.data.notice}</p>
    <div className="support-grid">{users.data.users.map(user=><article className="panel support-card" key={user.id}><h3>{user.name}</h3><p>{user.scope}</p><Button disabled={login.isPending} onClick={()=>login.mutate(user.id)}>Continue as {user.name.replace("Demo ","")}</Button></article>)}</div>
    {login.isError && <p role="alert">{login.error.message}</p>}
  </section>;
}

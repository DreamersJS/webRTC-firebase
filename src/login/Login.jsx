import React, { useContext, useState } from "react";
import { AppContext } from "./AppContext";
import { loginUser } from "./auth.service";

export function Login() {

  const { user, setUser } = useContext(AppContext);
  const [form, setForm] = useState({ email: "", password: "", });

  const updateForm = (prop) => (e) => {
    setForm({ ...form, [prop]: e.target.value });
  };

  const login = async (event) => {
    event.preventDefault();

    try {
      console.log("Logging in...");
      const credentials = await loginUser(form.email, form.password);
      setUser(credentials.user);
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex flex-col">

    {/* email */}
    <div className="mb-5">
      <label > Email </label>
      <input value={form.email} onChange={updateForm("email")} type="text" />
    </div>

    {/* password */}
    <div className="mb-5">
      <label > Email </label>
      <input value={form.password} onChange={updateForm("password")} type="text" />
    </div>

    <button onClick={login} > Login </button>
  </div>
  );
}

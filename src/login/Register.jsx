import React, { useContext, useState } from 'react';
import { registerUser } from './auth.service.js';
import { createUserProfile } from './users.service.js';
import { AppContext } from './AppContext.jsx';

export function Register() {
  const { setUser } = useContext(AppContext);
  const [form, setForm] = useState({
    uid: '',
    username: '',
    email: '',
    password: '',
  });

  const updateForm = (prop) => (e) => {
    setForm({ ...form, [prop]: e.target.value });
  };


  const register = async (event) => {
    event.preventDefault();
    try {
      const credentials = await registerUser(form.email, form.password);
      await createUserProfile(
        credentials.user.uid,
        form.username,
        form.email,
        form.password,
        [],
      );
      setUser(credentials.user);
    } catch (error) {
      console.log(error.message);
    }
  };

  return (
    <div className="flex flex-col">
      {/* username */}
      <div className="mb-5">
        <label > Email </label>
        <input value={form.username} onChange={updateForm("username")} type="text" />
      </div>

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

      <button onClick={register} > Register </button>
    </div>
  );
}

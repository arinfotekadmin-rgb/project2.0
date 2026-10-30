
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BACKEND_URL = import.meta.env.VITE_BACKEND;

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!userId.trim() || !email.trim() || !password) {
      setIsError(true);
      setMessage("Please enter your User ID, email, and password.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: userId.trim(),
            email: email.trim(),
            password,
            role,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed. Please check your credentials."
        );
      }

      const loggedInUser = data.user;

      if (!loggedInUser) {
        throw new Error("The server did not return user details.");
      }

      const actualRole = String(loggedInUser.role || "").toLowerCase();

      if (actualRole !== "admin" && actualRole !== "student") {
        throw new Error("Your account has an unrecognized role.");
      }

      if (actualRole !== role) {
        throw new Error("Please select the correct login role.");
      }

      localStorage.setItem(
        "user",
        JSON.stringify({ ...loggedInUser, role: actualRole })
      );

      navigate(actualRole === "admin" ? "/admin" : "/student", {
        replace: true,
      });
    } catch (error) {
      setIsError(true);
      setMessage(
        error.message || "Unable to connect to the AttendEase backend."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-blue-700 p-5">
      <section className="w-full max-w-md rounded-3xl bg-white p-7 shadow-2xl sm:p-9">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
          🎓
        </div>

        <h1 className="text-center text-2xl font-bold text-slate-900">
          Welcome Back!
        </h1>

        <p className="mb-8 mt-2 text-center text-sm leading-6 text-slate-500">
          AttendEase
          <br />
          Student Attendance Management System
        </p>

        <form onSubmit={handleLogin}>
          <label
            htmlFor="role"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Login As
          </label>

          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
            className="mb-5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="student">Student</option>
            <option value="admin">Admin</option>
          </select>

          <label
            htmlFor="userId"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            User ID
          </label>

          <input
            id="userId"
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="Enter your User ID"
            autoComplete="username"
            required
            className="mb-5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Email Address
          </label>

          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your registered email"
            autoComplete="email"
            required
            className="mb-5 w-full rounded-xl border border-slate-300 bg-slate-50 p-3.5 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            Password
          </label>

          <div className="mb-6 flex rounded-xl border border-slate-300 bg-slate-50 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
              className="min-w-0 flex-1 rounded-l-xl bg-transparent p-3.5 text-slate-900 outline-none"
            />

            <button
              type="button"
              onClick={() => setShowPassword((previous) => !previous)}
              className="px-3 text-sm font-medium text-blue-700"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-4 py-3.5 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in..." : "Sign In →"}
          </button>

          {message && (
            <p
              role="alert"
              className={`mt-4 text-center text-sm ${
                isError ? "text-red-600" : "text-green-700"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <footer className="mt-7 border-t border-slate-200 pt-5 text-center text-xs text-slate-400">
          AttendEase · Student Attendance Management System
        </footer>
      </section>
    </main>
  );
}

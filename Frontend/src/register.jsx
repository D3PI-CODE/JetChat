import './register.css';

export default function Register() {
  return (
    <div className="w-full max-w-md space-y-8 rounded-xl bg-[#D9D9D9] p-8 md:p-12 shadow-2xl">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-text-light">
          Create an Account
        </h1>
        <p className="mt-2 text-sm text-text-subtle">
          Dep's Realtime Chat App
        </p>
      </div>
      <form className="space-y-6">
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-normal text-text-light pb-2"
            htmlFor="full-name"
          >
            Full Name
          </label>
          <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-transparent bg-[#111818]/20 text-text-light focus:outline-0 focus:ring-0 h-12 placeholder:text-text-subtle p-3 text-base font-normal leading-normal transition-shadow duration-200"
            id="user-name"
            name="user-name"
            placeholder="e.g., JaneDoe321"
            type="text"
          />
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-normal text-text-light pb-2"
            htmlFor="email"
          >
            Email
          </label>
          <input
            className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-transparent bg-[#111818]/20 text-text-light focus:outline-0 focus:ring-0 h-12 placeholder:text-text-subtle p-3 text-base font-normal leading-normal transition-shadow duration-200"
            id="email"
            name="email"
            placeholder="e.g., jane.doe@example.com"
            type="email"
          />
          <p className="mt-2 text-sm text-error hidden">
            Please enter a valid email address.
          </p>
        </div>
        <div className="flex flex-col">
          <label
            className="text-sm font-medium leading-normal text-text-light pb-2"
            htmlFor="password"
          >
            Password
          </label>
          <div className="relative flex w-full flex-1 items-stretch">
            <input
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-lg border border-transparent bg-[#111818]/20 text-text-light focus:outline-0 focus:ring-0 h-12 placeholder:text-text-subtle p-3 pr-10 text-base font-normal leading-normal transition-shadow duration-200"
              id="password"
              name="password"
              placeholder="8+ characters"
              type="password"
            />
          </div>
          <p className="mt-2 text-xs text-text-subtle">
            Must include at least 8 characters, one uppercase letter, and one
            number.
          </p>
        </div>
        <button className="Register flex min-w-[84px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-primary bg-[#111818]/20 text-base font-bold" type="submit bg-"> Register </button>
      </form>
      <div className="text-center">
        <p className="text-sm text-text-subtle">
          Already have an account? <a className="font-semibold text-primary hover:underline" href="#"> Log in</a>
        </p>
      </div>
    </div>
  );
}
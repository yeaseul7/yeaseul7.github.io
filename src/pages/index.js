import * as React from "react";
import { pageheader, main, contentsBox } from "../styles/index.module.css";
import { Link } from "gatsby";
import Navbar from "../components/navbar";

const IndexPage = () => {
  return (
    <main>
      <header className={pageheader}>
        <Link to="/">Esl_int_00's Blog</Link>
      </header>
      <div className={main}>
        <Navbar />
        <div className={contentsBox}>
          <h1>Home Page</h1>
          <p>Welcome to my blog!</p>
        </div>
      </div>
    </main>
  );
};

export default IndexPage;

export const Head = () => <title>Home Page</title>;

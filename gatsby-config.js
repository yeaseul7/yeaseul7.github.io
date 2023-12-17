/**
 * @type {import('gatsby').GatsbyConfig}
 */
module.exports = {
  siteMetadata: {
    title: `Eslint_00's blog`,
    siteUrl: `https://www.yourdomain.tld`,
  },
  plugins: [
    {
      resolve: `gatsby-plugin-fusejs`,
      options: {
        query: `
        {
          allMarkdownRemark {
            nodes {
              id
              rawMarkdownBody
              frontmatter {
                title
              }
            }
          }
        }
      `,
        keys: ["title", "body"],
        normalizer: ({ data }) =>
          data.allMarkdownRemark.nodes.map((node) => ({
            id: node.id,
            title: node.frontmatter.title,
            body: node.rawMarkdownBody,
          })),
      },
    },
  ],
};

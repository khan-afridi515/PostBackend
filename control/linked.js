const axios = require("axios");

const getAccessToken = async (code) => {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: process.env.LINKED_IN_CLIENT_ID,
    client_secret: process.env.LINKED_IN_CLIENT_SECERT,
    redirect_uri: "http://localhost:3000/api/linkedIn/callback"
  });

  const { data } = await axios.post(
    "https://www.linkedin.com/oauth/v2/accessToken",
    body.toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  return data;
};


const getUserOrganizations = async (accessToken) => {
  const url =
    "https://api.linkedin.com/v2/organizationalEntityAcls" +
    "?q=roleAssignee&role=ADMINISTRATOR" +
    "&projection=(elements*(organizationalTarget~(id,name,vanityName)))";

  const { data } = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "X-Restli-Protocol-Version": "2.0.0"
    }
  });

  return data.elements;
};


exports.linkedInWork = async (req, res) => {

  console.log("This is my linkedIn work");
  try {
    const { code, error, error_description } = req.query;
    console.log("This is my linkedIn Code", code);

    if (error) {
      return res.status(400).json({ error, error_description });
    }

    const tokenData = await getAccessToken(code);
    console.log("This is tokenData:", tokenData);
    const organizations = await getUserOrganizations(tokenData.access_token);

    console.log("This is linkedIn organization", organizations);

    res.cookie("li_token", tokenData.access_token, {
      httpOnly: true,
      sameSite: "lax"
    });

    res.cookie("li_orgs", JSON.stringify(organizations), {
      sameSite: "lax"
    });

    res.redirect("http://localhost:5173/linked/work");
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "LinkedIn auth failed" });
  }
};

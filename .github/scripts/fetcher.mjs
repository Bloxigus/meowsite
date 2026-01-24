import fs from 'fs';

const projects = {};

function fetchAll(start, max) {
  console.log('Fetching ' + start + ' / ' + max);
  return fetch('https://api.modrinth.com/v2/search?facets=[[%22project_type:resourcepack%22]]&limit=100&offset=' + start, {
    headers: {
      'User-Agent': 'meowdding/website (' + atob('Y29udGFjdEB0aGF0Z3Jhdnlib2F0LnRlY2g=') + ')'
    }
  })
    .then((response) => {
      try {
        return response.json();
      } catch (e) {
        console.error('Failed to fetch data from Modrinth API');
        throw e;
      }
    }).then((data) => {
      data.hits.forEach(project => {
        projects[project.project_id] = {
          slug: project.slug,
          title: project.title,
          icon: project.icon_url,
          latest_version: project.latest_version,
          downloads: project.downloads
        };
      });
      return data;
    }).then(async (data) => {
      if (data.offset + 100 >= max) return;

      await timeout(500);
      return fetchAll(data.offset + 100, data.total_hits);
    });
}

async function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchCatharsisVersions() {
  return fetch('https://api.modrinth.com/v2/project/catharsis', {
    headers: {
      'User-Agent': 'meowdding/website (' + atob('Y29udGFjdEB0aGF0Z3Jhdnlib2F0LnRlY2g=') + ')'
    }
  })
    .then((response) => {
      try {
        return response.json();
      } catch (e) {
        console.error('Failed to fetch data from Modrinth API');
        throw e;
      }
    })
    .then((data => data.versions));
}

async function fetchVersions(versionIds, catharsisVersions) {
  return fetch('https://api.modrinth.com/v2/versions?include_changelog=false&ids=' + JSON.stringify(versionIds), {
    headers: {
      'User-Agent': 'meowdding/website (' + atob('Y29udGFjdEB0aGF0Z3Jhdnlib2F0LnRlY2g=') + ')'
    }
  })
    .then((response) => {
      try {
        return response.json();
      } catch (e) {
        console.error('Failed to fetch data from Modrinth API');
        throw e;
      }
    })
    .then((data) => {
      let versions = [];

      data.forEach((version) => {
        console.log(version);
        version.dependencies.forEach((element) => {
          if (element.project_id === 'fc4wBpRx' || element.version_id in catharsisVersions) {
            versions.push(version.project_id);
          }
        });
      });

      return versions;
    });
}

async function run() {
  let catharsisVersions = await fetchCatharsisVersions();
  await fetchAll(0, 101);
  let versions = [];
  for (let projectId in projects) {
    let project = projects[projectId];
    versions.push(project.latest_version);
  }
  let requireCatharsis = await fetchVersions(versions, catharsisVersions);

  let projectData = {};

  for (let project in requireCatharsis) {
    projectData[project] = projects[project];
  }

  fs.writeFileSync('./public/resourcepacks.json', JSON.stringify(projectData, null, 2));
}

run();

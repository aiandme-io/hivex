#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

// Basic validation functions
function validateProject(project) {
  return project.slug && 
         project.title && 
         project.status && 
         project.branch &&
         typeof project.slug === 'string' &&
         typeof project.title === 'string' &&
         typeof project.status === 'string' &&
         typeof project.branch === 'string';
}

function validateResult(result) {
  return result.id && 
         result.author_github && 
         result.type && 
         result.severity && 
         result.impact && 
         result.submitted_at &&
         typeof result.id === 'string' &&
         typeof result.author_github === 'string' &&
         typeof result.type === 'string' &&
         typeof result.severity === 'string' &&
         typeof result.impact === 'string' &&
         typeof result.submitted_at === 'string';
}

// Scoring system
const SEVERITY_SCORES = {
  'Critical': 10,
  'High': 6,
  'Medium': 3,
  'Low': 1
};

const BONUSES = {
  first_report: 2,
  quality_bonus: 1
};

async function main() {
  console.log('🚀 Starting HiveX data aggregation...');
  
  try {
    // Ensure output directory exists
    await fs.ensureDir('data_out');
    
    // Get all project branches
    const projects = await discoverProjects();
    console.log(`📁 Found ${projects.length} projects`);
    
    // Process each project
    const projectData = [];
    const allResults = [];
    const contributorStats = new Map();
    
    for (const project of projects) {
      console.log(`🔍 Processing project: ${project.slug}`);
      
      // Validate project.json
      if (!validateProject(project)) {
        console.warn(`⚠️  Invalid project.json for ${project.slug}`);
        continue;
      }
      
      // Get results for this project
      const results = await getProjectResults(project.slug);
      console.log(`   Found ${results.length} results`);
      
      // Process results and calculate scores
      const projectResults = [];
      for (const result of results) {
        if (validateResult(result)) {
          projectResults.push(result);
          allResults.push(result);
          
          // Calculate contributor score
          const score = calculateScore(result);
          const contributors = [result.author_github, ...(result.co_authors || [])];
          
          contributors.forEach(contributor => {
            if (!contributorStats.has(contributor)) {
              contributorStats.set(contributor, {
                points: 0,
                reports: 0,
                projects: new Set(),
                by_severity: { Critical: 0, High: 0, Medium: 0, Low: 0 }
              });
            }
            
            const stats = contributorStats.get(contributor);
            stats.points += score;
            stats.reports += 1;
            stats.projects.add(project.slug);
            
            // Track severity breakdown per contributor
            if (stats.by_severity.hasOwnProperty(result.severity)) {
              stats.by_severity[result.severity]++;
            }
          });
        } else {
          console.warn(`⚠️  Invalid result.json for ${project.slug}`);
        }
      }
      
      // Calculate severity breakdown for this project
      const severityBreakdown = getSeverityBreakdown(projectResults);
      
      // Save project-specific results in website-expected format
      if (projectResults.length > 0) {
        await fs.writeJson(
          path.join('data_out', `results-${project.slug}.json`),
          {
            project: {
              slug: project.slug,
              title: project.title,
              status: project.status,
              target_url: project.target_url || null,
              branch: project.branch,
              commit: project.commit || null,
              last_updated: projectResults[projectResults.length - 1].submitted_at
            },
            stats: {
              total_results: projectResults.length,
              by_severity: severityBreakdown
            },
            results: projectResults
          },
          { spaces: 2 }
        );
      }
      
      // Prepare project data for projects index
      projectData.push({
        slug: project.slug,
        title: project.title,
        status: project.status,
        branch: project.branch,
        github_branch_url: `https://github.com/aiandme-io/hivex/tree/${project.branch}`,
        readme_raw_url: `https://raw.githubusercontent.com/aiandme-io/hivex/${project.branch}/README.md`,
        results_url: `https://data.hivex.aiandme.io/results-${project.slug}.json`,
        stats: {
          total_results: projectResults.length,
          by_severity: severityBreakdown
        }
      });
    }
    
    // Generate projects.json in website-expected format
    await fs.writeJson(
      path.join('data_out', 'index.json'),
      {
        version: "1.0.0",
        last_updated: new Date().toISOString(),
        projects: projectData
      },
      { spaces: 2 }
    );
    
    // Generate leaderboard.json in website-expected format
    const leaderboard = generateLeaderboard(contributorStats, allResults);
    await fs.writeJson(
      path.join('data_out', 'leaderboard.json'),
      leaderboard,
      { spaces: 2 }
    );
    
    console.log('✅ Data aggregation completed successfully!');
    console.log(`📊 Generated data for ${projectData.length} projects`);
    console.log(`📈 Total results: ${allResults.length}`);
    console.log(`🏆 Contributors: ${contributorStats.size}`);
    
  } catch (error) {
    console.error('❌ Error during aggregation:', error);
    process.exit(1);
  }
}

async function discoverProjects() {
  const projects = [];
  const projectDir = 'project';
  
  if (!await fs.pathExists(projectDir)) {
    return projects;
  }
  
  const entries = await fs.readdir(projectDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const projectPath = path.join(projectDir, entry.name);
      const projectJsonPath = path.join(projectPath, 'project.json');
      
      if (await fs.pathExists(projectJsonPath)) {
        try {
          const projectData = await fs.readJson(projectJsonPath);
          projects.push(projectData);
        } catch (error) {
          console.warn(`⚠️  Could not read project.json for ${entry.name}:`, error.message);
        }
      }
    }
  }
  
  return projects;
}

async function getProjectResults(projectSlug) {
  const results = [];
  const resultsDir = path.join('project', projectSlug, 'results');
  
  if (!await fs.pathExists(resultsDir)) {
    return results;
  }
  
  const entries = await fs.readdir(resultsDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isDirectory()) {
      const resultJsonPath = path.join(resultsDir, entry.name, 'result.json');
      
      if (await fs.pathExists(resultJsonPath)) {
        try {
          const resultData = await fs.readJson(resultJsonPath);
          results.push(resultData);
        } catch (error) {
          console.warn(`⚠️  Could not read result.json in ${entry.name}:`, error.message);
        }
      }
    }
  }
  
  // Sort by submission date
  return results.sort((a, b) => new Date(a.submitted_at) - new Date(b.submitted_at));
}

function calculateScore(result) {
  let score = SEVERITY_SCORES[result.severity] || 0;
  
  // Add bonuses if applicable
  if (result.steps && result.steps.length > 0) {
    score += BONUSES.quality_bonus;
  }
  
  if (result.repro_cmds && result.repro_cmds.length > 0) {
    score += BONUSES.quality_bonus;
  }
  
  return score;
}

function getSeverityBreakdown(results) {
  const breakdown = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  results.forEach(result => {
    if (breakdown.hasOwnProperty(result.severity)) {
      breakdown[result.severity]++;
    }
  });
  return breakdown;
}

function generateLeaderboard(contributorStats, allResults) {
  const contributors = Array.from(contributorStats.entries()).map(([github, stats]) => ({
    github,
    display: github, // Use github username as display name
    points: stats.points,
    reports: stats.reports,
    by_severity: stats.by_severity,
    bonuses: {
      first_report: 0, // Could be calculated if needed
      quality_bonus: 0  // Could be calculated if needed
    },
    by_project: Array.from(stats.projects).reduce((acc, project) => {
      acc[project] = 1; // Simple count, could be enhanced
      return acc;
    }, {})
  }));
  
  // Sort by points (descending)
  contributors.sort((a, b) => b.points - a.points);
  
  const totals = {
    contributors: contributors.length,
    reports: allResults.length,
    points: contributors.reduce((sum, c) => sum + c.points, 0)
  };
  
  return {
    last_updated: new Date().toISOString(),
    period: 'all-time',
    scoring: {
      ...SEVERITY_SCORES,
      first_report_bonus: BONUSES.first_report,
      quality_bonus: BONUSES.quality_bonus
    },
    contributors,
    totals
  };
}

// Run the aggregation
if (require.main === module) {
  main();
}

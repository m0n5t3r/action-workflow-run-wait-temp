/* eslint-disable camelcase */

// node modules
import { inspect } from 'util'

// packages
import core from '@actions/core'
import github from '@actions/github'

export default async function ({ octokit, workflow_id, run_id }) {
  // get current run of this workflow
  const { data: { workflow_runs } } = await octokit.request('GET /repos/{owner}/{repo}/actions/workflows/{workflow_id}/runs', {
    ...github.context.repo,
    workflow_id
  })

  core.debug(`found ${workflow_runs.length} runs of workflow ${workflow_id}`)
  // core.debug(inspect(workflow_runs))

  const { sha } = github.context

  // filter and sort
  const current_runs = workflow_runs
    // exclude this one
    .filter(run => run.id !== run_id)
    // filter to only runs for the same commit
    .filter(run => run.head_sha === sha)
    // filter out unsuccessful completed runs (cancelled / failed)
    .filter(run => (run.status !== 'completed') || (run.conclusion === 'success'))
    // pick relevant properties
    .map(run => ({ id: run.id, name: run.name, created_at: run.created_at }))

  core.info(`found ${current_runs.length} existing runs of workflow ${workflow_id} for sha ${sha}`)

  if(current_runs.length > 0) {
    core.info('successful or in-progress runs found, bailing out')
    await octokit.request('POST /repos/{owner}/{repo}/actions/runs/{run_id}/cancel', {
      ...github.context.repo,
      run_id: run_id
    })
  }
}

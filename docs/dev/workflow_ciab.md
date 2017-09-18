# CORD-in-a-Box Workflow

This document describes a workflow for service or core development using Cord-in-a-box with the rcord-virtual profile.

This workflow involves tearing down XOS as well as any active OpenStack objects (Instances, Networks, etc), rebuilding XOS container images, and then redeploying XOS. We sometimes refer to this as a "mini-End2End" as it does result in a new XOS deployment with an E2E test, but does not require a full reinstall. 

## Initial deployment

Prepare an rcord-virtual installation as described in `Building and Installing CORD: Quickstart`.

## Development loop

1. Make changes to your service code and propagate them to your CiaB host. There are a number of ways to propagate changes to the host depending on developer preference, including using gerrit draft reviews, git branches, rsync, scp, etc. 

2. First, tear down the existing XOS installation and clean up OpenStack to remove any leftover instances or networks:

    ```
    cd ~/cord/build
    make xos-teardown
    make clean-openstack
    ```

3. Optional: Teardown ONOS. Sometimes we find it helpful to reinstall the onos-cord and onos-fabric containers, to ensure that all state is wiped clean from ONOS.

    ```
    cd ~/cord/build
    make clean-onos
    ```

4. Now, build the new container images and deploy to the pod

    ```
    cd ~/cord/build
    make -j4 build
    make compute-node-refresh
    make pod-test
    ```

5. Test and verify your changes

6. Go back to step #1
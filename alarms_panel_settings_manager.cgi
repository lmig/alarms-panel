#!/usr/local/bin/perl

# --------------------------------------------------------------------------------------
# Gestion de los ficheros de filtros y layout por usuario para el nuevo panel de alarmas
# --------------------------------------------------------------------------------------

BEGIN {
  require "entorno.cfg";
};

use diagnostics;
use strict;
use warnings;

use html;
use general;
use JSON;
use Fcntl qw(:DEFAULT :flock);
use Data::Dumper;

my ($user) = param("UserName");
my ($domain) = param("zona");
my ($profile) = param("Perfil");
my ($httpd_home) = param("httpd_home");
my ($apli) = param("apli");

########################################################################################
# Funciones de soporte para la gestion de los ficheros
########################################################################################

sub HTTP_return($$){
  my $header = shift;
  my $retval = shift;
  print STDOUT "Content-Length: " . length($retval) ."\n";
  print STDOUT "Content-Type: $header\n\n";
  print STDOUT $retval;
}

sub HTTP_return_json($$) {
  my $result_code = shift;
  my $message = shift;
  my $retval = encode_json({ 'response' => { 'result_code' => $result_code, 'message' => $message }});
  HTTP_return('application/json', $retval);
}

sub gen_user_id {
  my ($user, $profile, $domain) = @_;
  my $userid = $user . "_" . $profile . "_" . $domain;
  return($userid);
}

sub get_user_lock_file {
  my ($userid) = @_;
  if (!$ENV{DIRIACALARMS_REPO_CONF}) {
    error('get_user_lock_file', 'Undefined DIRIACALARMS_REPO_CONF');
  }
  return ($ENV{DIRIACALARMS_REPO_CONF} . '/' . $userid . '/.' . $userid . '.lock');
}

sub create_alarms_panel_repository {

  my ($user, $profile, $domain) = @_;
  my (@directories, @files);

  if (!$ENV{DIRIACALARMS_REPO_CONF}) {
    error('create_alarm_panel_repository', 'Undefined DIRIACALARMS_REPO_CONF');
  }

  my $userid = gen_user_id($user, $profile, $domain);
  my $userconfdir = "$ENV{DIRIACALARMS_REPO_CONF}/$userid";
  my $lockfile = get_user_lock_file($userid);
  @directories = ($userconfdir);
  @files = ($lockfile);

  for my $directory(@directories) {
    if (! -d $directory) {
      if (system('mkdir', '-m', '0750', '-p', '--', $directory) != 0) {
        error('create_alarm_panel_repository', "Can't create directory $directory");
        return -1;
      }
      if (system('cp', $ENV{DIRIACALARMS_REPO_CONF} . '/alarms_panel_config_default.json', $directory . '/alarms_panel_config.json') != 0) {
        error('create_alarm_panel_repository', "Can't move default panel configuration to $directory");
        return -1;
      }
    }
  }

  for my $file(@files) {
    if (! -e $file) {
      if (open(REPO, ">$file")) {
        close(REPO);
        chmod 0750, $file;
      } else {
        error('create_alarm_panel_repository', "Can't create file $file");
        return -1;
      }
    }
  }

  return 0;
}

sub delete_json_file($$) {
  my $jsonfile = shift;
  my $lockfile = shift;
  if (!sysopen(LOCKFILE, $lockfile, O_RDWR)) {
    error('delete_json_file', "No se pudo abrir el fichero $lockfile'.\n");
    return (-1);
  }
  if (!flock(LOCKFILE, LOCK_EX)) {
    error('delete_json_file', "No se pudo bloquear el fichero '$lockfile'.\n");
    return (-1);
  }
  if (!unlink ($jsonfile)) {
    error('delete_json_file', "No se pudo borrar el fichero '$jsonfile'.\n");
    return (-1);
  }
  if (!flock(LOCKFILE, LOCK_UN)) {
    error('delete_json_file', "No se pudo desbloquear el fichero '$lockfile'.\n");
    return (-1);
  }

  return 0;
}

sub update_json_file($$$) {
  my $jsonfile = shift;
  my $jsoncontent = shift;
  my $lockfile = shift;

  if (!sysopen(LOCKFILE, $lockfile, O_RDWR)) {
    error('update_json_file', "No se pudo abrir el fichero $lockfile'.\n");
    return(-1);
  }
  if (!flock(LOCKFILE, LOCK_EX)) {
    error('update_json_file', "No se pudo bloquear el fichero '$lockfile'.\n");
    return(-1);
  }
  open(FILEHANDLE, '>',  $jsonfile . '.tmp' ) or return (-1);
  print FILEHANDLE $jsoncontent or return (-1);
  close FILEHANDLE or return (-1);
  rename($jsonfile . '.tmp', $jsonfile) or return (-1);
  if (!flock(LOCKFILE, LOCK_UN)) {
     error('update_json_file', "No se pudo desbloquear el fichero '$lockfile'.\n");
     return (-1);
  }
  return(0);
}

sub list_files($$) {
  my $filepath = shift;
  my $fileMask = shift;
  my @files = ();
  if (chdir $filepath) {
    @files = glob($fileMask);
  }
  return(encode_json({ 'files' => \@files }));
}


########################################################################################
# Main
########################################################################################

my $file = param('file');
my $operation = param('operation');

my $userid;
my $lockfile;
my $filepath;

if (defined $user) {
  $userid = gen_user_id($user, $profile, $domain);
  $lockfile = get_user_lock_file($userid); 
  $filepath = $ENV{DIRIACALARMS_REPO_CONF} . '/' . $userid . '/';
  if (create_alarms_panel_repository($user, $profile, $domain) != 0) {
    HTTP_return_json(-1, 'Error creating repository');
    exit(-1);
  }
} else {
  $filepath = $ENV{DIRIACALARMS_REPO_CONF} . '/';
}

if ($operation eq 'delete') {
  if (delete_json_file($filepath . $file, $lockfile) == 0) {
    HTTP_return_json(0, 'OK');
    exit(0);
  } else {
    HTTP_return_json(-1, 'Error deleting file');
    exit(-1);
  }
} elsif ($operation eq 'update') {
  if (update_json_file($filepath . $file, param('jsoncontent'), $lockfile) == 0) {
    HTTP_return_json(0, 'OK');
    exit(0);
  } else {
    HTTP_return_json(-1, 'Error updating file');
    exit(-1);
  }
} elsif ($operation eq 'get') {
  if (open(JSONFILE, $filepath . $file)) {
    my $holdTerminator = $/;
    undef $/;
    my $jsoncontent = <JSONFILE>;
    $/ = $holdTerminator;
    close(JSONFILE);
    HTTP_return('application/json', $jsoncontent);
  } else {
    HTTP_return('application/json', '');
  }
} elsif($operation eq 'list') {
  HTTP_return('application/json', list_files($filepath, $file));
} else {
  HTTP_return_json(-1, 'Command not implemented');
  exit(-1);
}


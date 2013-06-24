# Plugin for Foswiki - The Free and Open Source Wiki, http://foswiki.org/
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version. For
# more details read LICENSE in the root of this distribution.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
#
# For licensing info read LICENSE file in the Foswiki root.

package Foswiki::Plugins::GlossarPlugin::Controller;

use strict;

use JSON;

use Foswiki::Func    ();
use Foswiki::Plugins ();

=pod
Acts as a controller for the JavaScript.
If no term is given in the request it will return a list of known definitions, otherwise it will return the definition of the term.
=cut

sub _getList {
    my ($user, $glossar, $addQuery) = @_;

    return (undef, '403', ($Foswiki::cfg{Extensions}{GlossarPlugin}{AccessAreaPermission}
      || 'Error: Unfortunately you do not have sufficient permissions to view glossary entries!'))
      unless Foswiki::Func::checkAccessPermission('VIEW', $user, '', undef,
        $glossar, undef);

    my $kwdata =
      Foswiki::Func::expandCommonVariables(<<SEARCH, 'GlossarIndex', 'Glossar');
%SEARCH{
type="query"
"form.name ~ '*GlossarForm' AND Enabled = 'Enabled'$addQuery"
web="$glossar"
nonoise="on"
format="\$topic\t\$formfield(keywords)"
separator="\$n"
footer=""
header=""
}%
SEARCH

    my $re = {};
    for my $entry (split(/\n/, $kwdata)) {
        $entry =~
          s/^\s*(.+?)\s*$/$1/gs;  # trim on both sides, probably unnecessarily
        next if !$entry;
        my ($topic, $kws) = split(/\t/, $entry, 2);
        my @kws = split(/\s*,\s*/, $kws);
        $re->{$topic} = \@kws;
    }
    return $re;
}

sub _getTopic {
    my ($user, $glossar, $topic) = @_;

    my $re;
    unless (
        Foswiki::Func::checkAccessPermission(
            'VIEW', $user, '', $topic, $glossar, undef
        ))
    {
        $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{AccessMsg}
          || 'Error: Unfortunately you do not have sufficient permissions to view this definition!';
        return (undef, '403', $re);
    }
    unless (Foswiki::Func::topicExists($glossar, $topic)) {
        $re = $Foswiki::cfg{Extensions}{GlossarPlugin}{NotFoundMsg}
          || 'Error: Definition not found!';
        return (undef, '404', $re);
    }

    my $canChange = Foswiki::Func::checkAccessPermission('CHANGE', $user, '', $topic, $glossar, undef);

    # generate text for popup from found topic
    my ($meta, $text) = Foswiki::Func::readTopic($glossar, $topic);
    $re = Foswiki::Func::expandCommonVariables($text, $topic, $glossar, $meta);
    $re = Foswiki::Func::renderText($re, $glossar);

    my $cssclass = $meta->get( 'FIELD', 'GlossarClass' );
    $cssclass = ( $cssclass ) ? $cssclass->{value} : '';

    return {
        topic => $topic,
        text => $re,
        edit => $canChange,
        cssclass => $cssclass
    };
}

sub response {
    my ($session, $subject, $verb, $response) = @_;
    my $query = $session->{request};
    my $topic = $query->{param}->{thetopic}[0];  # topic to display in a popup
    my $user = $Foswiki::Plugins::SESSION->{user};  # user for AccessPermission
    $user = Foswiki::Func::getWikiName($user);
    my $glossar = $Foswiki::cfg{Extensions}{GlossarPlugin}{GlossarWeb}
      || 'Glossar';  # The web with the definitions
    my $addQuery =
      $Foswiki::cfg{Extensions}{GlossarPlugin}
      {AdditionalQuery};  # Additional Query
    $addQuery = " AND $addQuery" if $addQuery;
    my $windowtitle = '';

    my @re; # contents of response

    # check if topic is given, otherwise a list of terms is requested
    if (not defined $topic) {
        @re = _getList($user, $glossar, $addQuery);
    } else {
        @re = _getTopic($user, $glossar, $topic);
    }
    my $status = defined($re[0]) ? 'ok' : $re[1];
    my $payload = defined($re[0]) ? $re[0] : [];
    my $errmsg = defined($re[0]) ? '' : $re[2];
    my $class = $re[3] || '';

    my $resp = "jQuery.callbackData="
      . JSON->new->encode({
            status   => $status,
            errorMsg => $errmsg,
            payload  => $payload,
      });
    $response->header(
        '-Cache-Control' => 'max-age=36000, public',
        '-Expires'       => '+12h',
    );
    return $resp;
}

1;
